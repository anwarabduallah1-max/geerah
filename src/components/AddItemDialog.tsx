import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Loader2, MapPin, ShieldCheck, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { spring, modalVariants, overlayVariants, staggerContainer, staggerItem, STAGGER_DELAY } from "@/lib/spring";
import type { PriceType } from "@/types";

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const categories = [
  { key: "tools", label: "أدوات", emoji: "🔧" },
  { key: "kitchen", label: "مطبخ", emoji: "🍳" },
  { key: "electronics", label: "إلكترونيات", emoji: "💻" },
  { key: "furniture", label: "أثاث", emoji: "🪑" },
  { key: "books", label: "كتب", emoji: "📚" },
  { key: "sports", label: "رياضة", emoji: "⚽" },
  { key: "gardening", label: "حديقة", emoji: "🌱" },
  { key: "other", label: "أخرى", emoji: "📦" },
];

const conditions = [
  { key: "new", label: "جديد" },
  { key: "like_new", label: "شبه جديد" },
  { key: "good", label: "جيد" },
  { key: "well_used", label: "مستخدم" },
];

const priceTypes: { key: PriceType; label: string; emoji: string }[] = [
  { key: "free", label: "مجاني", emoji: "🎁" },
  { key: "borrow", label: "استعارة", emoji: "🔄" },
  { key: "for_sale", label: "للبيع", emoji: "💰" },
];

export const AddItemDialog = ({ isOpen, onClose, onSuccess }: AddItemDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("tools");
  const [condition, setCondition] = useState("good");
  const [priceType, setPriceType] = useState<PriceType>("free");
  const [priceValue, setPriceValue] = useState("");
  const [nafathOnly, setNafathOnly] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory("tools"); setCondition("good");
    setPriceType("free"); setPriceValue(""); setNafathOnly(false); setPhotos([]);
  };

  const handleAddPhoto = () => {
    if (photos.length >= 3) { toast.error("الحد الأقصى 3 صور"); return; }
    // Placeholder — would open file picker in production
    setPhotos([...photos, `photo_${photos.length + 1}`]);
    toast.success("تم إضافة صورة (تجريبي)");
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    if (!title.trim()) { toast.error("يرجى إدخال اسم الغرض"); return; }
    if (title.trim().length > 100) { toast.error("اسم الغرض طويل جداً (الحد الأقصى 100 حرف)"); return; }
    if (description.length > 500) { toast.error("الوصف طويل جداً (الحد الأقصى 500 حرف)"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("items").insert({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        price_type: priceType,
        price_value: priceType === "for_sale" ? Number(priceValue) || 0 : 0,
      });
      if (error) throw error;
      toast.success("تم إضافة الغرض بنجاح! ✅");
      resetForm(); onSuccess(); onClose();
    } catch (err: any) { toast.error(err.message || "حدث خطأ أثناء الإضافة"); }
    finally { setLoading(false); }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="exit" transition={spring.overlay}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50" onClick={onClose} />
          <motion.div
            variants={modalVariants} initial="hidden" animate="visible" exit="exit" transition={spring.modal}
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-[2rem] max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 className="text-lg font-bold text-foreground">إضافة غرض جديد</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted active:scale-95 transition-transform">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Scrollable content */}
            <motion.div
              variants={staggerContainer} initial="hidden" animate="visible"
              className="flex-1 overflow-y-auto px-5 pb-32 space-y-5"
            >
              {/* Photo Upload */}
              <motion.div variants={staggerItem} transition={spring.staggerChild}>
                <label className="block text-sm font-bold text-foreground mb-2">الصور</label>
                <div className="flex gap-3">
                  {[0, 1, 2].map((i) => (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.95 }}
                      transition={spring.tap}
                      onClick={() => photos[i] ? handleRemovePhoto(i) : handleAddPhoto()}
                      className={`relative w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                        photos[i]
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/30 hover:border-primary/50"
                      }`}
                    >
                      {photos[i] ? (
                        <>
                          <div className="w-full h-full rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Camera size={24} className="text-primary" />
                          </div>
                          <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                            <X size={12} className="text-destructive-foreground" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Plus size={20} className="text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {i === 0 ? "رئيسية" : `صورة ${i + 1}`}
                          </span>
                        </>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Title */}
              <motion.div variants={staggerItem} transition={spring.staggerChild}>
                <label className="block text-sm font-bold text-foreground mb-1.5">اسم الغرض *</label>
                <input
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مثقاب Bosch، سلم 3 متر"
                  maxLength={100}
                  className="w-full h-12 px-4 rounded-2xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
              </motion.div>

              {/* Category */}
              <motion.div variants={staggerItem} transition={spring.staggerChild}>
                <label className="block text-sm font-bold text-foreground mb-2">التصنيف</label>
                <div className="grid grid-cols-4 gap-2">
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.key} type="button" whileTap={{ scale: 0.95 }} transition={spring.tap}
                      onClick={() => setCategory(cat.key)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
                        category === cat.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <span className="text-base">{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Description */}
              <motion.div variants={staggerItem} transition={spring.staggerChild}>
                <label className="block text-sm font-bold text-foreground mb-1.5">الوصف</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف مختصر للغرض ونصائح الاستخدام..."
                  maxLength={500} rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-shadow"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-left">{description.length}/500</p>
              </motion.div>

              {/* Condition */}
              <motion.div variants={staggerItem} transition={spring.staggerChild}>
                <label className="block text-sm font-bold text-foreground mb-2">الحالة</label>
                <div className="flex gap-2">
                  {conditions.map((c) => (
                    <motion.button
                      key={c.key} type="button" whileTap={{ scale: 0.95 }} transition={spring.tap}
                      onClick={() => setCondition(c.key)}
                      className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-colors ${
                        condition === c.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {c.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Price Type */}
              <motion.div variants={staggerItem} transition={spring.staggerChild}>
                <label className="block text-sm font-bold text-foreground mb-2">نوع العرض</label>
                <div className="flex gap-2">
                  {priceTypes.map((pt) => (
                    <motion.button
                      key={pt.key} type="button" whileTap={{ scale: 0.95 }} transition={spring.tap}
                      onClick={() => setPriceType(pt.key)}
                      className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${
                        priceType === pt.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <span>{pt.emoji}</span>
                      <span>{pt.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Price Input */}
              <AnimatePresence>
                {priceType === "for_sale" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    transition={spring.staggerChild}
                  >
                    <label className="block text-sm font-bold text-foreground mb-1.5">السعر (ر.س)</label>
                    <input
                      type="number" value={priceValue} onChange={(e) => setPriceValue(e.target.value)}
                      placeholder="0" min="0"
                      className="w-full h-12 px-4 rounded-2xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Nafath Verification Toggle */}
              <motion.div variants={staggerItem} transition={spring.staggerChild}>
                <div className="flex items-center justify-between bg-muted/30 border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShieldCheck size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">موثقين عبر نفاذ فقط</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        فقط الجيران الموثقين يمكنهم رؤية أو طلب هذا الغرض
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNafathOnly(!nafathOnly)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      nafathOnly ? "bg-primary" : "bg-border"
                    }`}
                  >
                    <motion.div
                      animate={{ x: nafathOnly ? -20 : 0 }}
                      transition={spring.tap}
                      className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-card shadow-sm"
                    />
                  </button>
                </div>
              </motion.div>

              {/* Location */}
              <motion.div variants={staggerItem} transition={spring.staggerChild}>
                <label className="block text-sm font-bold text-foreground mb-1.5">الموقع</label>
                <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-2xl px-4 py-3">
                  <MapPin size={18} className="text-primary" />
                  <span className="text-sm text-muted-foreground">النرجس، الرياض</span>
                  <span className="mr-auto text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">تلقائي</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Fixed bottom CTA */}
            <div className="absolute bottom-0 inset-x-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <motion.button
                whileTap={{ scale: 0.97 }} transition={spring.tap}
                onClick={handleSubmit}
                disabled={loading || !title.trim()}
                className="w-full h-13 bg-primary text-primary-foreground rounded-2xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                {loading ? "جاري الإضافة..." : "أضف الغرض ✨"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
