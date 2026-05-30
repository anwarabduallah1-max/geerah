import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Star, Package, Settings, LogOut, Crown, Sparkles, Trophy, Coins, Briefcase, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { spring, staggerContainer, staggerItem } from "@/lib/spring";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut, signIn, signUp, loading: authLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data ?? null;
    },
  });

  const { data: itemCount } = useQuery({
    queryKey: ["my-items-count", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { count } = await supabase.from("items").select("*", { count: "exact", head: true }).eq("owner_id", user!.id);
      return count || 0;
    },
  });

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError("يرجى ملء جميع الحقول"); return; }
    if (authMode === "signup" && !username.trim()) { setError("يرجى إدخال اسم المستخدم"); return; }
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setLoading(true); setError("");
    try {
      if (authMode === "signup") {
        await signUp(email.trim(), password, username.trim());
        // NOTE: تأكد من تفعيل خيار 'Confirm Email' في إعدادات Authentication في لوحة تحكم Supabase للحصول على رابط التفعيل.
        toast.success("نجحت! ✅ تم إنشاء حسابك، يرجى تفعيل حسابك من خلال الرابط المرسل لبريدك الإلكتروني، ثم سجل الدخول للبدء.", { duration: 5000 });
        setPassword("");
        setUsername("");
        setTimeout(() => {
          setAuthMode("signin");
          setError("");
        }, 3000);
      } else {
        await signIn(email.trim(), password);
        toast.success("تم تسجيل الدخول بنجاح! 🎉");
        setShowAuth(false); setEmail(""); setPassword(""); setUsername("");
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Invalid login credentials")) setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      else if (msg.includes("Email not confirmed")) setError("يرجى تأكيد بريدك الإلكتروني أولاً من الرابط المرسل إليك");
      else if (msg.includes("already registered") || msg.includes("User already registered")) setError("عذراً، هذا البريد الإلكتروني مستخدم مسبقاً");
      else if (msg.includes("invalid") && msg.includes("email")) setError("عذراً، هذا البريد الإلكتروني غير صالح");
      else setError(msg || "حدث خطأ غير متوقع");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 pb-20">
        <motion.div initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={spring.modal} className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-4xl">🏠</span></div>
          <h1 className="text-xl font-bold mb-2">مرحباً بك في جيرة</h1>
          <p className="text-muted-foreground text-sm mb-6">سجل دخولك لتتواصل مع جيرانك</p>
          {!showAuth ? (
            <div className="space-y-3">
              <Button onClick={() => { setShowAuth(true); setAuthMode("signin"); setError(""); }} className="w-full rounded-3xl h-12 font-bold active:scale-[0.97]">تسجيل الدخول</Button>
              <Button onClick={() => { setShowAuth(true); setAuthMode("signup"); setError(""); }} variant="outline" className="w-full rounded-3xl h-12 font-bold active:scale-[0.97]">حساب جديد</Button>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3 text-right">
              {authMode === "signup" && (
                <motion.input variants={staggerItem} transition={spring.staggerChild} type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم"
                  className="w-full h-12 px-4 rounded-3xl bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              )}
              <motion.input variants={staggerItem} transition={spring.staggerChild} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" dir="ltr"
                className="w-full h-12 px-4 rounded-3xl bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-left" />
              <motion.input variants={staggerItem} transition={spring.staggerChild} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور (6 أحرف على الأقل)" dir="ltr"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full h-12 px-4 rounded-3xl bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-left" />
              {error && (
                <motion.p initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={spring.staggerChild}
                  className="text-destructive text-xs bg-destructive/10 p-2 rounded-xl">{error}</motion.p>
              )}
              <motion.div variants={staggerItem} transition={spring.staggerChild}>
                <Button onClick={handleSubmit} disabled={loading} className="w-full rounded-3xl h-12 font-bold active:scale-[0.97]">
                  {loading ? "جاري التحميل..." : authMode === "signin" ? "دخول" : "تسجيل"}
                </Button>
              </motion.div>
              <motion.button variants={staggerItem} transition={spring.staggerChild}
                onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setError(""); }}
                className="text-xs text-primary">
                {authMode === "signin" ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب؟ سجل دخولك"}
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  const tier = (profile as any)?.tier || "free";
  const points = (profile as any)?.points || 0;
  const trustScore = (profile as any)?.trust_score || 0;
  const tierLabels: Record<string, string> = { free: "مجاني", regular: "عادي", business: "تجاري" };
  const tierLimits: Record<string, number> = { free: 2, regular: 4, business: 999 };

  return (
    <div className="h-full overflow-y-auto pb-20">
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="p-4">
        <motion.div variants={staggerItem} transition={spring.staggerChild} className="bg-card rounded-3xl border border-border p-6 text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 overflow-hidden">
            {(profile as any)?.avatar_url ? (
              <img src={(profile as any).avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>
          <h1 className="text-lg font-bold">{(profile as any)?.username || user.user_metadata?.username || "جار جديد"}</h1>
          <p className="text-xs text-muted-foreground mt-1">{user.email || "—"}</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1"><Star size={14} className="text-secondary" /><span className="text-sm font-medium">{trustScore}</span></div>
            <div className="flex items-center gap-1"><Package size={14} className="text-primary" /><span className="text-sm font-medium">{itemCount ?? 0}/{tierLimits[tier]} أغراض</span></div>
            <div className="flex items-center gap-1"><Coins size={14} className="text-primary" /><span className="text-sm font-medium">{points} نقطة</span></div>
          </div>
          <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{tierLabels[tier]}</span>
        </motion.div>

        <motion.div variants={staggerItem} transition={spring.staggerChild} className="bg-gradient-to-l from-secondary/20 to-primary/10 rounded-3xl border border-secondary/30 p-4 mb-4 flex items-center gap-3">
          <Crown size={24} className="text-primary" />
          <div className="flex-1">
            <p className="font-bold text-sm">الشارة الذهبية</p>
            <p className="text-xs text-muted-foreground">اشترك لتميّز ملفك الشخصي</p>
          </div>
          <Button size="sm" className="rounded-3xl text-xs active:scale-[0.97]" onClick={() => navigate("/subscription")}>اشترك</Button>
        </motion.div>

        <motion.div variants={staggerItem} transition={spring.staggerChild} className="bg-gradient-to-l from-primary/10 to-secondary/10 rounded-3xl border border-primary/20 p-4 mb-4 flex items-center gap-3">
          <Sparkles size={24} className="text-primary" />
          <div className="flex-1">
            <p className="font-bold text-sm">أبرز أغراضك</p>
            <p className="text-xs text-muted-foreground">اجعل أغراضك تظهر أولاً في السوق</p>
          </div>
          <Button size="sm" variant="outline" className="rounded-3xl text-xs active:scale-[0.97]">تفعيل</Button>
        </motion.div>

        <motion.div variants={staggerItem} transition={spring.staggerChild} className="space-y-2">
          <button onClick={() => navigate("/business")} className="w-full bg-card rounded-3xl border border-border p-4 flex items-center gap-3 text-right active:scale-[0.97] transition-transform">
            <Briefcase size={18} className="text-primary" /><span className="text-sm font-medium">الأعمال والتوصيل</span>
          </button>
          <button onClick={() => navigate("/subscription")} className="w-full bg-card rounded-3xl border border-border p-4 flex items-center gap-3 text-right active:scale-[0.97] transition-transform">
            <CreditCard size={18} className="text-primary" /><span className="text-sm font-medium">الاشتراكات والمحفظة</span>
          </button>
          <button className="w-full bg-card rounded-3xl border border-border p-4 flex items-center gap-3 text-right active:scale-[0.97] transition-transform">
            <Settings size={18} className="text-muted-foreground" /><span className="text-sm font-medium">الإعدادات</span>
          </button>
          <button onClick={signOut} className="w-full bg-card rounded-3xl border border-border p-4 flex items-center gap-3 text-right active:scale-[0.97] transition-transform">
            <LogOut size={18} className="text-destructive" /><span className="text-sm font-medium text-destructive">تسجيل الخروج</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
