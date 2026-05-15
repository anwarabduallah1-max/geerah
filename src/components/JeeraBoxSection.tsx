import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Plus, Loader2, Search, Heart, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { spring, staggerContainer, staggerItem } from "@/lib/spring";
import { logSecurityEvent } from "@/lib/securityLog";

const categories = ["أخرى", "أدوات", "مطبخ", "إلكترونيات", "ملابس", "كتب", "أثاث", "رياضة"];

function useJeeraBox() {
  return useQuery({
    queryKey: ["jeera_box"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jeera_box")
        .select("*")
        .is("claimed_by", null)
        .order("created_at", { ascending: false });
      if (error) {
        logSecurityEvent({ event_type: "jeera_box_query_failed", resource: "jeera_box", details: { message: error.message, code: error.code } });
        throw error;
      }
      return data;
    },
  });
}

export function JeeraBoxSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useJeeraBox();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("أخرى");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار صورة");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجا");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory("أخرى");
    clearImage();
    setShowAdd(false);
  };

  const donate = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      let image_url: string | null = null;
      if (imageFile) {
        setUploading(true);
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("jeera-box-images")
          .upload(path, imageFile, { upsert: false, contentType: imageFile.type });
        if (upErr) {
          logSecurityEvent({ event_type: "storage_upload_failed", resource: `jeera-box-images/${path}`, details: { message: upErr.message } });
          throw upErr;
        }
        const { data: pub } = supabase.storage.from("jeera-box-images").getPublicUrl(path);
        image_url = pub.publicUrl;
      }
      const { error } = await supabase.from("jeera_box").insert({
        donor_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        image_url,
      } as any);
      if (error) {
        logSecurityEvent({ event_type: "jeera_box_insert_failed", resource: "jeera_box", details: { message: error.message, code: error.code } });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jeera_box"] });
      toast.success("تم إضافة التبرع! 🎁");
      resetForm();
      setUploading(false);
    },
    onError: (e: any) => { toast.error(e?.message || "حدث خطأ"); setUploading(false); },
  });

  const claim = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("jeera_box")
        .update({ claimed_by: user.id, claimed_at: new Date().toISOString() } as any)
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jeera_box"] });
      toast.success("تم حجز الغرض لك! ✅");
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const filtered = items.filter((i: any) =>
    search ? i.title?.includes(search) || i.category?.includes(search) : true
  );

  const busy = donate.isPending || uploading;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">أغراض مجانية مشتركة من جيرانك في المنطقة المحيطة</p>

      <div className="relative mb-3">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في الصندوق..."
          className="w-full h-10 pr-10 pl-4 rounded-2xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {user && (
        <motion.button whileTap={{ scale: 0.97 }} transition={spring.tap}
          onClick={() => setShowAdd(!showAdd)}
          className="w-full mb-3 h-10 rounded-2xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5">
          <Plus size={14} /> تبرّع بغرض
        </motion.button>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
            <div className="bg-card rounded-2xl border border-border p-3 space-y-2">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم الغرض" maxLength={80}
                className="w-full h-9 px-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف قصير..." maxLength={300} rows={2}
                className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={imagePreview} alt="معاينة" className="w-full h-40 object-cover" />
                  <button onClick={clearImage} type="button"
                    className="absolute top-2 left-2 w-7 h-7 rounded-full bg-background/90 text-foreground flex items-center justify-center shadow">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-xs flex flex-col items-center justify-center gap-1 hover:bg-muted/50 transition-colors">
                  <ImagePlus size={20} />
                  أضف صورة (اختياري)
                </button>
              )}

              <div className="flex gap-1.5 flex-wrap">
                {categories.map((c) => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${category === c ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { if (title.trim()) donate.mutate(); else toast.error("أدخل اسم الغرض"); }}
                  disabled={busy}
                  className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                  {uploading ? "جاري رفع الصورة..." : "تبرّع"}
                </button>
                <button onClick={resetForm} className="h-9 px-4 rounded-xl bg-muted text-muted-foreground text-xs font-bold">إلغاء</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Gift size={40} className="mb-3 opacity-50" />
          <p className="text-sm">الصندوق فارغ حالياً</p>
          <p className="text-xs mt-1">كن أول من يتبرع بغرض!</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3">
          {filtered.map((item: any) => (
            <motion.div key={item.id} variants={staggerItem} transition={spring.listItem}
              className="bg-card rounded-3xl border border-border overflow-hidden">
              <div className="aspect-square bg-muted/50 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={() => logSecurityEvent({ event_type: "image_load_failed", resource: item.image_url, details: { item_id: item.id } })}
                  />
                ) : (
                  <Gift size={32} className="text-muted-foreground/50" />
                )}
              </div>
              <div className="p-3">
                <h3 className="font-bold text-xs truncate">{item.title}</h3>
                <span className="inline-block bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full mt-1">{item.category}</span>
                {item.description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                <motion.button whileTap={{ scale: 0.95 }} transition={spring.tap}
                  onClick={() => { if (!user) { toast.error("سجل دخولك أولاً"); return; } claim.mutate(item.id); }}
                  disabled={claim.isPending}
                  className="w-full mt-2 h-8 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                  <Heart size={12} /> أريد هذا
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
