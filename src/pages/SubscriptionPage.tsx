import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { spring, tapScale, staggerContainer, staggerItem } from "@/lib/spring";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Image as ImageIcon, Coins, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import PlisioPaymentDialog from "@/components/PlisioPaymentDialog";

type Plan = "normal" | "business";

const PLANS: { id: Plan; name: string; price: number; perks: string[]; gradient: string; icon: any }[] = [
  {
    id: "normal",
    name: "اشتراك عادي",
    price: 19,
    perks: ["إزالة الإعلانات", "حد أعلى للأغراض", "أولوية في السوق"],
    gradient: "from-primary/20 to-secondary/10",
    icon: Sparkles,
  },
  {
    id: "business",
    name: "اشتراك تجاري",
    price: 49,
    perks: ["نشر إعلانات على الخريطة", "متجر للأعمال", "شارة تجارية موثقة", "كل مزايا العادي"],
    gradient: "from-amber-500/20 via-primary/15 to-primary/20",
    icon: Crown,
  },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
  });

  const redeemPoints = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("redeem_points_for_subscription");
      if (error) throw error;
      const r = data as any;
      if (!r?.success) throw new Error(r?.error === "insufficient_points" ? `تحتاج ${r.needed} نقطة، لديك ${r.have}` : r?.error);
    },
    onSuccess: () => { toast.success("تم استبدال النقاط باشتراك عادي 🎉"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const buyPlan = useMutation({
    mutationFn: async (plan: Plan) => {
      const { data, error } = await supabase.rpc("purchase_subscription", { p_plan: plan });
      if (error) throw error;
      const r = data as any;
      if (!r?.success) throw new Error(r?.error === "insufficient_balance" ? `الرصيد غير كافٍ — تحتاج ${r.needed} ر.س. اشحن محفظتك أولاً.` : r?.error);
    },
    onSuccess: () => { toast.success("تم تفعيل الاشتراك 🎉"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const buySlot = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("purchase_photo_slots", { p_slots: 1 });
      if (error) throw error;
      const r = data as any;
      if (!r?.success) throw new Error(r?.error === "insufficient_balance" ? `الرصيد غير كافٍ — تحتاج ${r.needed} ر.س. اشحن محفظتك أولاً.` : r?.error);
    },
    onSuccess: () => { toast.success("تمت إضافة خانة صور 🎉"); qc.invalidateQueries({ queryKey: ["my-profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const sub = (profile as any)?.subscription_type || "none";
  const points = (profile as any)?.points || 0;
  const slots = (profile as any)?.photo_slots ?? 2;

  const [payment, setPayment] = useState<{ amount: number; name: string; type: string } | null>(null);


  return (
    <div className="h-full overflow-y-auto pb-24">
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="p-4 space-y-4">
        <motion.div variants={staggerItem} transition={spring.staggerChild} className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-2xl glass flex items-center justify-center gpu tap-fast">
            <ArrowRight size={16} />
          </button>
          <h1 className="text-lg font-bold">الاشتراكات</h1>
          <div className="w-9" />
        </motion.div>

        <motion.div variants={staggerItem} transition={spring.staggerChild} className="glass-strong rounded-3xl p-4 flex items-center gap-3">
          <Coins size={22} className="text-primary" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">رصيد النقاط</p>
            <p className="font-bold">{points} نقطة</p>
          </div>
          <Button size="sm" variant="outline" className="rounded-2xl text-xs" disabled={points < 1000 || redeemPoints.isPending} onClick={() => redeemPoints.mutate()}>
            استبدال 1000 نقطة باشتراك عادي
          </Button>
        </motion.div>

        {PLANS.map((plan) => {
          const isCurrent = sub === plan.id;
          const Icon = plan.icon;
          return (
            <motion.div
              key={plan.id}
              variants={staggerItem}
              transition={spring.staggerChild}
              className={`relative rounded-3xl p-5 bg-gradient-to-br ${plan.gradient} border border-white/10 shadow-soft-lg gpu`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center">
                  <Icon size={20} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.price} ر.س / شهرياً</p>
                </div>
                {isCurrent && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary text-primary-foreground">مفعّل</span>}
              </div>
              <ul className="space-y-1.5 mb-4">
                {plan.perks.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check size={12} className="text-primary" /> {p}
                  </li>
                ))}
              </ul>
              <motion.button
                whileTap={tapScale}
                transition={spring.tap}
                onClick={() => setPayment({ amount: plan.price, name: plan.name, type: `subscription_${plan.id}` })}
                className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm gpu tap-fast"
              >
                {isCurrent ? "تجديد" : "اشترك الآن"}
              </motion.button>
            </motion.div>
          );
        })}

        <motion.div variants={staggerItem} transition={spring.staggerChild} className="glass-strong rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <ImageIcon size={20} className="text-primary" />
            <div className="flex-1">
              <p className="font-bold text-sm">خانات الصور الإضافية</p>
              <p className="text-xs text-muted-foreground">{slots}/8 — أضف صوراً أكثر لملفك بدفعة واحدة (9 ر.س للخانة)</p>
            </div>
          </div>
          <Button onClick={() => buySlot.mutate()} disabled={slots >= 8 || buySlot.isPending} className="w-full rounded-2xl" variant="outline">
            شراء خانة إضافية (من المحفظة)
          </Button>
        </motion.div>
      </motion.div>

    </div>
  );
}
