import { useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { SlideOverPanel } from "@/components/SlideOverPanel";
import { AddItemDialog } from "@/components/AddItemDialog";
import { Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useItems, useRequestItem } from "@/hooks/useItems";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { spring, staggerItem } from "@/lib/spring";
import type { Tables } from "@/integrations/supabase/types";

type Item = Tables<"items">;

const categories = [
  { key: "all", label: "الكل" },
  { key: "tools", label: "أدوات" },
  { key: "kitchen", label: "مطبخ" },
  { key: "electronics", label: "إلكترونيات" },
  { key: "furniture", label: "أثاث" },
  { key: "books", label: "كتب" },
  { key: "sports", label: "رياضة" },
];

export default function MarketPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useItems();
  const requestItem = useRequestItem();

  const filtered = items.filter((item) => {
    const matchSearch = item.title.includes(search) || (item.description || "").includes(search);
    const matchCat = category === "all" || item.category === category;
    return matchSearch && matchCat;
  });

  const handleRequest = (itemId: string) => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    requestItem.mutate(itemId, { onSuccess: () => setSelectedItem(null) });
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="pt-4 px-4">
        <h1 className="text-xl font-bold mb-3">السوق 🛍️</h1>
      </div>
      <div className="px-4 pb-3">
        <div className="relative mb-3">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن غرض..."
            className="w-full h-10 pr-4 pl-4 rounded-3xl bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <motion.button key={cat.key} whileTap={{ scale: 0.97 }} transition={spring.tap} onClick={() => setCategory(cat.key)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${category === cat.key ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}>
              {cat.label}
            </motion.button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item, i) => (
              <motion.div key={item.id} variants={staggerItem} initial="hidden" animate="visible"
                transition={{ ...spring.listItem, delay: i * 0.04 }}>
                <ItemCard item={item} onClick={() => setSelectedItem(item)} />
              </motion.div>
            ))}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <p>لا توجد أغراض بعد 🔍</p>
            <p className="text-xs mt-2">كن أول من يضيف غرضاً!</p>
          </div>
        )}
      </div>

      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={spring.tap}
        onClick={() => { if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; } setShowAddItem(true); }}
        className="fixed bottom-20 left-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center">
        <Plus size={24} />
      </motion.button>

      <AddItemDialog isOpen={showAddItem} onClose={() => setShowAddItem(false)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["items"] })} />

      <SlideOverPanel isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title || ""}>
        {selectedItem && (
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-3xl flex items-center justify-center"><span className="text-4xl">📦</span></div>
            <span className="inline-block bg-primary/10 text-primary font-bold text-xs px-3 py-1 rounded-full">
              {selectedItem.price_type === "free" ? "مجاني" : selectedItem.price_type === "borrow" ? "استعارة" : `${selectedItem.price_value} ر.س`}
            </span>
            <p className="text-muted-foreground text-sm">{selectedItem.description}</p>
            <motion.button whileTap={{ scale: 0.97 }} transition={spring.tap} onClick={() => handleRequest(selectedItem.id)}
              disabled={requestItem.isPending || selectedItem.owner_id === user?.id}
              className="w-full h-12 bg-primary text-primary-foreground rounded-3xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {requestItem.isPending ? <Loader2 size={18} className="animate-spin" /> : selectedItem.owner_id === user?.id ? "هذا غرضك" : "اطلب هذا الغرض"}
            </motion.button>
          </div>
        )}
      </SlideOverPanel>
    </div>
  );
}
