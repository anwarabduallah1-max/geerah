import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

interface AddItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddItemDrawer = ({ isOpen, onClose }: AddItemDrawerProps) => {
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
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory("أخرى"); setCondition("good");
    setPriceType("free"); setPriceValue(""); setNafathOnly(false);
    setSecurityDeposit(""); setAvailable(true); setPhotos([null, null, null]);
  };

  const handlePickPhoto = async (idx: number, file: File | null) => {
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("حجم الصورة كبير جداً (الحد 8MB)"); return; }
    setUploadingIdx(idx);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}-${idx}.${ext}`;
      const { error: upErr } = await supabase.storage.from("item-images").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type || "image/jpeg",
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("item-images").getPublicUrl(path);
      setPhotos((p) => p.map((v, i) => (i === idx ? pub.publicUrl : v)));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message?.includes("row-level") ? "تعذر الرفع — تأكد من تسجيل الدخول" : "فشل رفع الصورة");
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    if (!title.trim()) { toast.error("أدخل اسم الغرض"); return; }

    setSubmitting(true);

    // Check tier limits
    const { data: profile } = await supabase.from("profiles").select("tier").eq("user_id", user.id).single();
    const tier = (profile as any)?.tier || "free";
    const limits: Record<string, number> = { free: 2, regular: 4, business: 999 };
    const maxItems = limits[tier] || 2;

    const { count } = await supabase.from("items").select("*", { count: "exact", head: true }).eq("owner_id", user.id);
    if ((count || 0) >= maxItems) {
      toast.error(`وصلت للحد الأقصى (${maxItems} أغراض). ترقّ لباقة أعلى لإضافة المزيد.`);
      setSubmitting(false);
      return;
    }

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
      image_url: photos.find((p) => !!p) ?? null,
    } as any);

    setSubmitting(false);
    if (error) {
      toast.error("حدث خطأ أثناء الإضافة");
      console.error(error);
    } else {
      toast.success("تمت إضافة الغرض بنجاح! 🎉");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      resetForm();
      onClose();
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-foreground/30 z-[50]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[50] bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col"
            style={{ maxHeight: "85vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2 shrink-0">
              <h2 className="text-lg font-bold">إضافة غرض جديد</h2>
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-muted active:scale-95 transition-transform">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {/* Photos */}
              <div className="mt-2">
                <p className="text-sm font-bold text-foreground mb-2">صور الغرض</p>
                <div className="flex gap-3">
                  {[0, 1, 2].map((i) => (
                    <label
                      key={i}
                      className={`relative flex-1 aspect-square rounded-2xl border-2 border-dashed bg-muted/40 flex flex-col items-center justify-center gap-1 cursor-pointer overflow-hidden transition-colors ${photos[i] ? "border-primary" : i === 0 ? "border-primary/50" : "border-border"}`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handlePickPhoto(i, e.target.files?.[0] ?? null)}
                      />
                      {photos[i] ? (
                        <img src={photos[i]!} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : uploadingIdx === i ? (
                        <Loader2 size={18} className="text-primary animate-spin" />
                      ) : (
                        <>
                          <Camera size={18} className="text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{i === 0 ? "رئيسية" : `صورة ${i + 1}`}</span>
                        </>
                      )}
                    </label>
                  ))}
                </div>
              </div>


              {/* Title */}
              <div className="mt-4">
                <label className="text-sm font-bold text-foreground">اسم الغرض</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مثقاب Bosch، سلم 3 متر"
                  className="mt-1 w-full h-11 rounded-2xl bg-muted/40 border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Category */}
              <div className="mt-4">
                <label className="text-sm font-bold text-foreground">التصنيف</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {categories.map((c) => (
                    <button key={c.label} type="button" onClick={() => setCategory(c.label)}
                      className={`flex flex-col items-center gap-0.5 py-2 rounded-2xl border text-xs font-medium transition-colors ${category === c.label ? "bg-primary/10 border-primary text-primary" : "bg-muted/40 border-border text-foreground"}`}>
                      <span className="text-base">{c.emoji}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-foreground">الوصف</label>
                  <span className="text-[10px] text-muted-foreground">{description.length}/300</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                  placeholder="صِف الغرض ونصائح الاستخدام..."
                  rows={2}
                  className="mt-1 w-full rounded-2xl bg-muted/40 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Condition */}
              <div className="mt-4">
                <label className="text-sm font-bold text-foreground">الحالة</label>
                <div className="mt-2 flex gap-2">
                  {conditions.map((c) => (
                    <button key={c.value} type="button" onClick={() => setCondition(c.value)}
                      className={`flex-1 py-2 rounded-2xl border text-xs font-medium transition-colors ${condition === c.value ? "bg-primary/10 border-primary text-primary" : "bg-muted/40 border-border text-foreground"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price type */}
              <div className="mt-4">
                <label className="text-sm font-bold text-foreground">نوع الغرض</label>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setPriceType("free")}
                    className={`flex-1 py-2.5 rounded-2xl border text-sm font-bold transition-colors ${priceType === "free" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border text-foreground"}`}>
                    مجاني
                  </button>
                  <button type="button" onClick={() => setPriceType("borrow")}
                    className={`flex-1 py-2.5 rounded-2xl border text-sm font-bold transition-colors ${priceType === "borrow" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border text-foreground"}`}>
                    إيجار
                  </button>
                </div>
                {priceType === "borrow" && (
                  <input value={priceValue} onChange={(e) => setPriceValue(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="المبلغ بالريال" inputMode="decimal"
                    className="mt-2 w-full h-11 rounded-2xl bg-muted/40 border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30" />
                )}
              </div>

              {/* Trust & Security */}
              <div className="mt-4">
                <p className="text-sm font-bold text-foreground mb-2">الأمان والثقة</p>
                <div className="flex items-center justify-between rounded-2xl bg-muted/40 border border-border px-4 py-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" />
                    <span className="text-xs text-foreground">موثق عبر نفاذ فقط</span>
                  </div>
                  <button type="button" onClick={() => setNafathOnly(!nafathOnly)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${nafathOnly ? "bg-primary" : "bg-border"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-primary-foreground shadow transition-transform ${nafathOnly ? "right-0.5" : "right-auto left-0.5"}`} />
                  </button>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-muted/40 border border-border px-4 py-2.5 mb-2">
                  <span className="text-xs text-foreground shrink-0">مبلغ تأمين (ر.س)</span>
                  <input value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="اختياري" inputMode="decimal"
                    className="flex-1 bg-transparent text-sm text-foreground text-left placeholder:text-muted-foreground outline-none" />
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-muted/40 border border-border px-4 py-2.5">
                  <span className="text-xs text-foreground">متاح الآن</span>
                  <button type="button" onClick={() => setAvailable(!available)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${available ? "bg-primary" : "bg-border"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-primary-foreground shadow transition-transform ${available ? "right-0.5" : "right-auto left-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* Location */}
              <div className="mt-4 mb-2">
                <div className="flex items-center gap-3 rounded-2xl bg-muted/40 border border-border px-4 py-2.5">
                  <MapPin size={16} className="text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">الرقة، سوريا</span>
                </div>
              </div>
            </div>

            {/* Fixed CTA */}
            <div className="p-4 pt-2 border-t border-border bg-card shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring.tap}
                onClick={handleSubmit}
                disabled={submitting || !title.trim()}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : "أضف الغرض"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
