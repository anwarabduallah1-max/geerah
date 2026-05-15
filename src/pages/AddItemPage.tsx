import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Camera, MapPin, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { spring } from "@/lib/spring";

const categories = [
  { emoji: "🔧", label: "أدوات" },
  { emoji: "🍳", label: "مطبخ" },
  { emoji: "📱", label: "إلكترونيات" },
  { emoji: "🌱", label: "حديقة" },
  { emoji: "⚽", label: "رياضة" },
  { emoji: "👕", label: "ملابس" },
  { emoji: "📚", label: "كتب" },
  { emoji: "📦", label: "أخرى" },
];

const conditions = [
  { value: "new", label: "جديد" },
  { value: "like_new", label: "شبه جديد" },
  { value: "good", label: "جيد" },
  { value: "well_used", label: "مستخدم" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
};

export default function AddItemPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("أخرى");
  const [condition, setCondition] = useState("good");
  const [priceType, setPriceType] = useState<"free" | "borrow">("free");
  const [priceValue, setPriceValue] = useState("");
  const [nafathOnly, setNafathOnly] = useState(false);
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [available, setAvailable] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    if (!title.trim()) { toast.error("أدخل اسم الغرض"); return; }

    setSubmitting(true);
    const { error } = await supabase.from("items").insert({
      owner_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      price_type: priceType,
      price_value: priceType === "borrow" ? Number(priceValue) || 0 : 0,
      status: available ? "available" : "busy",
      nafath_only: nafathOnly,
      security_deposit: Number(securityDeposit) || 0,
      condition,
    } as any);

    setSubmitting(false);
    if (error) {
      toast.error("حدث خطأ أثناء الإضافة");
      console.error(error);
    } else {
      toast.success("تمت إضافة الغرض بنجاح! 🎉");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      navigate("/");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <X size={20} className="text-primary-foreground" />
        </button>
        <h1 className="text-lg font-bold text-primary-foreground">إضافة غرض جديد</h1>
        <div className="w-9" />
      </div>

      {/* Scrollable form */}
      <motion.div
        className="flex-1 overflow-y-auto px-4 pb-28"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Photos */}
        <motion.div variants={fadeUp} className="mt-4">
          <p className="text-sm font-bold text-foreground mb-2">صور الغرض</p>
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`flex-1 aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-1 ${i === 0 ? "border-primary/50" : ""}`}
              >
                <Camera size={20} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {i === 0 ? "رئيسية" : `صورة ${i + 1}`}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Title */}
        <motion.div variants={fadeUp} className="mt-5">
          <label className="text-sm font-bold text-foreground">اسم الغرض</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: مثقاب Bosch، سلم 3 متر"
            className="mt-1 w-full h-12 rounded-2xl bg-muted/40 border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
        </motion.div>

        {/* Category */}
        <motion.div variants={fadeUp} className="mt-5">
          <label className="text-sm font-bold text-foreground">التصنيف</label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {categories.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setCategory(c.label)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border text-xs font-medium transition-colors ${
                  category === c.label
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/40 border-border text-foreground"
                }`}
              >
                <span className="text-lg">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Description */}
        <motion.div variants={fadeUp} className="mt-5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-foreground">الوصف</label>
            <span className="text-[10px] text-muted-foreground">{description.length}/300</span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 300))}
            placeholder="صِف الغرض ونصائح الاستخدام..."
            rows={3}
            className="mt-1 w-full rounded-2xl bg-muted/40 border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-primary/30"
          />
        </motion.div>

        {/* Condition */}
        <motion.div variants={fadeUp} className="mt-5">
          <label className="text-sm font-bold text-foreground">الحالة</label>
          <div className="mt-2 flex gap-2">
            {conditions.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCondition(c.value)}
                className={`flex-1 py-2.5 rounded-2xl border text-xs font-medium transition-colors ${
                  condition === c.value
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/40 border-border text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Price type */}
        <motion.div variants={fadeUp} className="mt-5">
          <label className="text-sm font-bold text-foreground">نوع الغرض</label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setPriceType("free")}
              className={`flex-1 py-3 rounded-2xl border text-sm font-bold transition-colors ${
                priceType === "free"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 border-border text-foreground"
              }`}
            >
              مجاني
            </button>
            <button
              type="button"
              onClick={() => setPriceType("borrow")}
              className={`flex-1 py-3 rounded-2xl border text-sm font-bold transition-colors ${
                priceType === "borrow"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 border-border text-foreground"
              }`}
            >
              إيجار
            </button>
          </div>
          {priceType === "borrow" && (
            <input
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="المبلغ بالريال"
              className="mt-2 w-full h-12 rounded-2xl bg-muted/40 border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              inputMode="decimal"
            />
          )}
        </motion.div>

        {/* Location */}
        <motion.div variants={fadeUp} className="mt-5">
          <label className="text-sm font-bold text-foreground">الموقع</label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-muted/40 border border-border px-4 py-3">
            <MapPin size={18} className="text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">الرقة، سوريا</span>
          </div>
        </motion.div>

        {/* Trust & Security */}
        <motion.div variants={fadeUp} className="mt-5">
          <p className="text-sm font-bold text-foreground mb-3">الأمان والثقة</p>

          {/* Nafath toggle */}
          <div className="flex items-center justify-between rounded-2xl bg-muted/40 border border-border px-4 py-3 mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              <span className="text-sm text-foreground">موثق عبر نفاذ فقط</span>
            </div>
            <button
              type="button"
              onClick={() => setNafathOnly(!nafathOnly)}
              className={`w-11 h-6 rounded-full transition-colors relative ${nafathOnly ? "bg-primary" : "bg-border"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-primary-foreground shadow transition-transform ${nafathOnly ? "right-0.5" : "right-auto left-0.5"}`} />
            </button>
          </div>

          {/* Security deposit */}
          <div className="flex items-center gap-3 rounded-2xl bg-muted/40 border border-border px-4 py-3 mb-2">
            <span className="text-sm text-foreground shrink-0">مبلغ تأمين (ر.س)</span>
            <input
              value={securityDeposit}
              onChange={(e) => setSecurityDeposit(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="اختياري"
              className="flex-1 bg-transparent text-sm text-foreground text-left placeholder:text-muted-foreground outline-none"
              inputMode="decimal"
            />
          </div>

          {/* Availability toggle */}
          <div className="flex items-center justify-between rounded-2xl bg-muted/40 border border-border px-4 py-3">
            <span className="text-sm text-foreground">متاح الآن</span>
            <button
              type="button"
              onClick={() => setAvailable(!available)}
              className={`w-11 h-6 rounded-full transition-colors relative ${available ? "bg-primary" : "bg-border"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-primary-foreground shadow transition-transform ${available ? "right-0.5" : "right-auto left-0.5"}`} />
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur border-t border-border">
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring.tap}
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="w-full h-13 rounded-2xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={20} className="animate-spin" /> : "أضف الغرض"}
        </motion.button>
      </div>
    </div>
  );
}
