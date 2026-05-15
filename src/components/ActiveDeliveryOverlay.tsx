import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, MapPin, Clock, ChevronUp, ChevronDown, ExternalLink, X, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { spring } from "@/lib/spring";

/**
 * Shows active delivery tracking as a bottom sheet over the map
 * when the user has a request that has been approved (accepted by a courier).
 */
export function ActiveDeliveryOverlay() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: activeDelivery } = useQuery({
    queryKey: ["active-delivery", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_requests")
        .select("*")
        .eq("requester_id", user!.id)
        .in("status", ["accepted", "picked_up"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: courier } = useQuery({
    queryKey: ["courier", activeDelivery?.courier_id],
    enabled: !!activeDelivery?.courier_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url, trust_score")
        .eq("user_id", activeDelivery!.courier_id!)
        .maybeSingle();
      return data;
    },
  });

  if (!activeDelivery || dismissed) return null;

  const statusLabel = activeDelivery.status === "picked_up" ? "في الطريق إليك" : "تم القبول — قيد الاستلام";
  const eta = activeDelivery.status === "picked_up" ? "~10 دقائق" : "~20 دقيقة";

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
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Truck size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">توصيل نشط</p>
              <p className="text-xs font-bold text-foreground leading-tight">{statusLabel}</p>
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
                  <p className="text-xs font-bold mb-2 text-foreground">{activeDelivery.title}</p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-green-600 shrink-0" />
                      <span className="text-muted-foreground truncate">{activeDelivery.pickup_address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-destructive shrink-0" />
                      <span className="text-muted-foreground truncate">{activeDelivery.dropoff_address}</span>
                    </div>
                  </div>
                </div>

                {/* Courier info */}
                {courier && (
                  <div className="flex items-center gap-3 bg-muted/40 rounded-2xl p-3">
                    <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center overflow-hidden">
                      {courier.avatar_url ? (
                        <img src={courier.avatar_url} alt={courier.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{courier.username}</p>
                      <p className="text-[10px] text-muted-foreground">الموصّل • ثقة {courier.trust_score}</p>
                    </div>
                    <button className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Phone size={14} />
                    </button>
                  </div>
                )}

                {/* ETA + Fee */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock size={13} className="text-primary" />
                    <span>الوصول خلال <span className="font-bold text-foreground">{eta}</span></span>
                  </div>
                  <span className="font-bold text-primary">
                    {activeDelivery.fee && Number(activeDelivery.fee) > 0 ? `${activeDelivery.fee} ر.س` : "مجاني"}
                  </span>
                </div>

                {/* Pay link */}
                {activeDelivery.payment_link && Number(activeDelivery.fee) > 0 && (
                  <a
                    href={activeDelivery.payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-10 rounded-2xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={14} /> ادفع للموصّل
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
