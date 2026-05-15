import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { spring, tapScale, staggerContainer, staggerItem } from "@/lib/spring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Bike, Megaphone, Store, Wallet as WalletIcon, Plus, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import { WalletCard } from "@/components/WalletCard";
import { AdComposer } from "@/components/AdComposer";

type Tab = "store" | "delivery" | "ads" | "wallet";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "store", label: "متجري", icon: Store },
  { id: "delivery", label: "التوصيل", icon: Bike },
  { id: "ads", label: "الإعلانات", icon: Megaphone },
  { id: "wallet", label: "المحفظة", icon: WalletIcon },
];

export default function BusinessHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("store");

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
  });

  const isBusiness = (profile as any)?.subscription_type === "business";

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center glass-strong rounded-3xl p-6">
          <Lock size={28} className="text-primary mx-auto mb-2" />
          <p className="font-bold mb-1">يلزم تسجيل الدخول</p>
          <Button onClick={() => navigate("/profile")} className="rounded-2xl mt-2">تسجيل الدخول</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-24">
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="p-4 space-y-4">
        <motion.div variants={staggerItem} transition={spring.staggerChild} className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-2xl glass flex items-center justify-center gpu tap-fast">
            <ArrowRight size={16} />
          </button>
          <h1 className="text-lg font-bold">الأعمال والتوصيل</h1>
          <button onClick={() => navigate("/subscription")} className="text-xs font-bold text-primary px-3 py-1.5 rounded-2xl glass">
            اشتراك
          </button>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={staggerItem} transition={spring.staggerChild} className="glass-strong rounded-3xl p-1 grid grid-cols-4 gap-1 gpu">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <motion.button
                key={t.id}
                whileTap={tapScale}
                transition={spring.tap}
                onClick={() => setTab(t.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl text-[11px] font-bold tap-fast gpu ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
              >
                {active && <motion.div layoutId="hubTab" className="absolute inset-0 bg-primary rounded-2xl" transition={spring.tab} />}
                <Icon size={16} className="relative z-10" />
                <span className="relative z-10">{t.label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {tab === "store" && <StoreTab isBusiness={isBusiness} />}
        {tab === "delivery" && <DeliveryTab userId={user.id} />}
        {tab === "ads" && <AdsTab userId={user.id} canPublish={isBusiness} />}
        {tab === "wallet" && <WalletCard />}
      </motion.div>
    </div>
  );
}

function StoreTab({ isBusiness }: { isBusiness: boolean }) {
  const navigate = useNavigate();
  if (!isBusiness) {
    return (
      <div className="glass rounded-3xl p-6 text-center">
        <Store size={28} className="text-primary mx-auto mb-2" />
        <p className="font-bold mb-1">يتطلب اشتراك تجاري</p>
        <p className="text-xs text-muted-foreground mb-4">انشر منتجات متجرك وقدّم عروضك للجيران بعد الاشتراك التجاري.</p>
        <Button onClick={() => navigate("/subscription")} className="rounded-2xl">اشترك الآن</Button>
      </div>
    );
  }
  return (
    <div className="glass-strong rounded-3xl p-5 text-center">
      <CheckCircle2 size={28} className="text-primary mx-auto mb-2" />
      <p className="font-bold mb-1">متجرك مفعّل</p>
      <p className="text-xs text-muted-foreground mb-3">أضف منتجاتك من خلال زر إضافة في الخريطة، وستظهر بعلامة تجارية مميزة.</p>
      <Button onClick={() => navigate("/")} className="rounded-2xl" variant="outline">إضافة منتج</Button>
    </div>
  );
}

function DeliveryTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");

  const { data: jobs = [] } = useQuery({
    queryKey: ["delivery-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const p = parseFloat(price);
      if (!title || !p) throw new Error("املأ العنوان والسعر");
      const { error } = await supabase.from("delivery_jobs").insert({
        requester_id: userId,
        title, description: desc, price: p,
        commission_fee: Math.round(p * 0.13 * 100) / 100,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم نشر الطلب");
      setShowForm(false); setTitle(""); setDesc(""); setPrice("");
      qc.invalidateQueries({ queryKey: ["delivery-jobs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const accept = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.from("delivery_jobs").update({ worker_id: userId, status: "accepted" }).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم قبول المهمة"); qc.invalidateQueries({ queryKey: ["delivery-jobs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.rpc("complete_delivery_job", { p_job_id: jobId });
      if (error) throw error;
      const r = data as any;
      if (!r?.success) throw new Error(r?.error);
      return r;
    },
    onSuccess: (r: any) => {
      toast.success(`تم إتمام التوصيل — عمولة ${r.commission} ر.س`);
      qc.invalidateQueries({ queryKey: ["delivery-jobs"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["wallet-tx"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="glass rounded-3xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike size={18} className="text-primary" />
          <p className="text-xs">منصة التوصيل — مجانية للعمال (عمولة 13% تُخصم عند الإنجاز)</p>
        </div>
        <Button size="sm" className="rounded-2xl" onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} /> طلب جديد
        </Button>
      </div>

      {showForm && (
        <div className="glass-strong rounded-3xl p-4 space-y-2">
          <Input placeholder="عنوان الطلب" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="تفاصيل" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          <Input placeholder="السعر (ر.س)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full rounded-2xl">نشر</Button>
        </div>
      )}

      {jobs.length === 0 && <div className="text-center text-xs text-muted-foreground py-8 glass rounded-3xl">لا توجد طلبات حالياً</div>}

      {jobs.map((j: any) => {
        const isMine = j.requester_id === userId;
        const isWorker = j.worker_id === userId;
        return (
          <div key={j.id} className="glass-strong rounded-3xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-sm">{j.title}</p>
                {j.description && <p className="text-xs text-muted-foreground mt-0.5">{j.description}</p>}
              </div>
              <span className="text-xs font-bold text-primary">{Number(j.price).toFixed(2)} ر.س</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
              <span>الحالة: {labelStatus(j.status)}</span>
              <span>عمولة: {Number(j.commission_fee || j.price * 0.13).toFixed(2)}</span>
            </div>
            {j.status === "open" && !isMine && (
              <Button size="sm" className="w-full rounded-2xl" onClick={() => accept.mutate(j.id)} disabled={accept.isPending}>قبول المهمة</Button>
            )}
            {j.status === "accepted" && isWorker && (
              <Button size="sm" className="w-full rounded-2xl" onClick={() => complete.mutate(j.id)} disabled={complete.isPending}>إنجاز التوصيل</Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AdsTab({ userId, canPublish }: { userId: string; canPublish: boolean }) {
  const qc = useQueryClient();
  const { data: myAds = [] } = useQuery({
    queryKey: ["my-ads", userId],
    queryFn: async () => {
      const { data } = await supabase.from("ads").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const toggle = useMutation({
    mutationFn: async (ad: any) => {
      const { error } = await supabase.from("ads").update({ is_active: !ad.is_active }).eq("id", ad.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-ads"] }); qc.invalidateQueries({ queryKey: ["ads"] }); },
  });

  return (
    <div className="space-y-3">
      <AdComposer canPublish={canPublish} />
      {myAds.length > 0 && <p className="text-xs font-bold text-muted-foreground px-2">إعلاناتي</p>}
      {myAds.map((a: any) => (
        <div key={a.id} className="glass rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">{a.title}</p>
            <p className="text-[11px] text-muted-foreground">{a.radius_km} كم • {a.is_active ? "نشط" : "متوقف"}</p>
          </div>
          <Button size="sm" variant="outline" className="rounded-2xl text-xs" onClick={() => toggle.mutate(a)}>
            {a.is_active ? "إيقاف" : "تفعيل"}
          </Button>
        </div>
      ))}
    </div>
  );
}

function labelStatus(s: string) {
  return ({ open: "مفتوح", accepted: "مقبول", completed: "منجز", cancelled: "ملغى" } as any)[s] || s;
}
