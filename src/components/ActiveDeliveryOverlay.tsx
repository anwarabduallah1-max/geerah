import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Clock, ChevronUp, ChevronDown, X, Phone, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Bottom-sheet overlay on the map showing the user's active delivery job
 * (either as requester or as the worker delivering it).
 */
export function ActiveDeliveryOverlay() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: activeJob } = useQuery({
    queryKey: ["active-delivery-job", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_jobs")
        .select("*")
        .or(`requester_id.eq.${user!.id},worker_id.eq.${user!.id}`)
        .in("status", ["accepted"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Realtime invalidation
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`delivery-jobs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_jobs" },
        () => qc.invalidateQueries({ queryKey: ["active-delivery-job", user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const { data: worker } = useQuery({
    queryKey: ["delivery-worker", activeJob?.worker_id],
    enabled: !!activeJob?.worker_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url, trust_score")
        .eq("user_id", activeJob!.worker_id!)
        .maybeSingle();
      return data;
    },
  });

  if (!activeJob || dismissed) return null;

  const isWorker = activeJob.worker_id === user?.id;

  const complete = async () => {
    const { data, error } = await supabase.rpc("complete_delivery_job", { p_job_id: activeJob.id });
    if (error) { toast.error(error.message); return; }
    const r = data as any;
    if (!r?.success) { toast.error(r?.error || "تعذّر الإنجاز"); return; }
    toast.success(`تم الإنجاز — عمولة ${r.commission} ر.س`);
    qc.invalidateQueries({ queryKey: ["active-delivery-job", user?.id] });
    qc.invalidateQueries({ queryKey: ["delivery-jobs"] });
    qc.invalidateQueries({ queryKey: ["my-profile"] });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="absolute bottom-20 left-3 right-3 z-[40] bg-card/95 backdrop-blur-lg rounded-3xl border border-border shadow-2xl overflow-hidden"
        style={{ transform: "translate3d(0,0,0)" }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Truck size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">توصيل نشط</p>
              <p className="text-xs font-bold text-foreground leading-tight">{isWorker ? "أنت توصّل هذا الطلب" : "قيد التوصيل"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCollapsed((c) => !c)} className="w-8 h-8 rounded-full hover:bg-muted/50 flex items-center justify-center">
              {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={() => setDismissed(true)} className="w-8 h-8 rounded-full hover:bg-muted/50 flex items-center justify-center">
              <X size={14} />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                <div className="bg-muted/40 rounded-2xl p-3">
                  <p className="text-xs font-bold mb-1 text-foreground">{activeJob.title}</p>
                  {activeJob.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{activeJob.description}</p>
                  )}
                </div>

                {worker && !isWorker && (
                  <div className="flex items-center gap-3 bg-muted/40 rounded-2xl p-3">
                    <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center overflow-hidden">
                      {worker.avatar_url ? (
                        <img src={worker.avatar_url} alt={worker.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{worker.username}</p>
                      <p className="text-[10px] text-muted-foreground">الموصّل • ثقة {worker.trust_score}</p>
                    </div>
                    <button className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Phone size={14} />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock size={13} className="text-primary" />
                    <span>قيد التنفيذ</span>
                  </div>
                  <span className="font-bold text-primary">{Number(activeJob.price).toFixed(2)} ر.س</span>
                </div>

                {isWorker && (
                  <button
                    onClick={complete}
                    className="w-full h-10 rounded-2xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> إنجاز التوصيل
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
