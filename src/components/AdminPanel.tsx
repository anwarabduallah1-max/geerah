import { motion, AnimatePresence } from "framer-motion";
import { Crown, Check, X, Users, Loader2, Shield, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { spring, staggerContainer, staggerItem, tapScale } from "@/lib/spring";
import { toast } from "sonner";
import { useState } from "react";

type SubTab = "pending" | "members";

export function AdminPanel() {
  const [sub, setSub] = useState<SubTab>("pending");
  const queryClient = useQueryClient();

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["admin-pending"],
    queryFn: async () => {
      const { data: approvals } = await supabase.from("admin_approvals").select("candidate_id");
      const counts: Record<string, number> = {};
      approvals?.forEach((a: any) => { counts[a.candidate_id] = (counts[a.candidate_id] || 0) + 1; });
      const pendingIds = Object.entries(counts).filter(([, c]) => c >= 5).map(([id]) => id);
      if (pendingIds.length === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("*").in("user_id", pendingIds).eq("is_admin", false);
      return (profs || []).map((p: any) => ({ ...p, votes: counts[p.user_id] || 0 }));
    },
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("trust_score", { ascending: false }).limit(200);
      return data || [];
    },
    enabled: sub === "members",
  });

  const decide = useMutation({
    mutationFn: async ({ candidateId, approve }: { candidateId: string; approve: boolean }) => {
      const { data, error } = await supabase.rpc("admin_decide_candidate", {
        p_candidate_id: candidateId,
        p_approve: approve,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending"] });
      queryClient.invalidateQueries({ queryKey: ["neighbors"] });
      toast.success(vars.approve ? "تمت الموافقة ✅" : "تم الرفض");
    },
    onError: () => toast.error("حدث خطأ"),
  });

  return (
    <div className="space-y-3 gpu">
      {/* Header banner */}
      <div className="glass-strong rounded-3xl p-4 flex items-center gap-3 shadow-soft-md">
        <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
          <Crown size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm">لوحة الإدارة</h3>
          <p className="text-[11px] text-muted-foreground">إدارة الترشيحات والأعضاء</p>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-2 p-1 rounded-2xl glass-strong">
        {(["pending", "members"] as const).map((t) => (
          <motion.button
            key={t}
            whileTap={tapScale}
            transition={spring.tap}
            onClick={() => setSub(t)}
            className={`flex-1 h-9 rounded-xl text-xs font-bold transition-colors ${sub === t ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"}`}
          >
            {t === "pending" ? `الترشيحات (${pending.length})` : "الأعضاء"}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={sub}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={spring.modal}
          className="gpu"
        >
          {sub === "pending" ? (
            pendingLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-muted-foreground">
                <Crown size={36} className="mb-2 opacity-40" />
                <p className="text-xs">لا توجد ترشيحات معلّقة</p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                {pending.map((p: any) => (
                  <motion.div key={p.id} variants={staggerItem} transition={spring.listItem}
                    className="glass rounded-2xl p-3 flex items-center gap-3 shadow-soft">
                    <div className="w-11 h-11 rounded-full bg-muted overflow-hidden flex items-center justify-center text-lg">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : "👤"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{p.username}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star size={10} className="text-secondary" />{p.trust_score}</span>
                        <span>•</span>
                        <span className="text-primary font-semibold">{p.votes} تصويت</span>
                      </div>
                    </div>
                    <motion.button whileTap={tapScale} transition={spring.tap}
                      onClick={() => decide.mutate({ candidateId: p.user_id, approve: true })}
                      className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-soft">
                      <Check size={16} />
                    </motion.button>
                    <motion.button whileTap={tapScale} transition={spring.tap}
                      onClick={() => decide.mutate({ candidateId: p.user_id, approve: false })}
                      className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                      <X size={16} />
                    </motion.button>
                  </motion.div>
                ))}
              </motion.div>
            )
          ) : membersLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
              {members.map((m: any) => (
                <motion.div key={m.id} variants={staggerItem} transition={spring.listItem}
                  className="glass rounded-2xl p-3 flex items-center gap-3 shadow-soft">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center text-base">
                    {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-bold truncate">{m.username}</p>
                      {m.is_admin && <Crown size={12} className="text-primary" />}
                      {m.is_verified && <Shield size={12} className="text-primary" />}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Star size={10} className="text-secondary" />
                      <span>{m.trust_score}</span>
                    </div>
                  </div>
                  <Users size={14} className="text-muted-foreground" />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
