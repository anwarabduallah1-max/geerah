import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronUp } from "lucide-react";
import { ItemCard } from "@/components/ItemCard";
import { useItems } from "@/hooks/useItems";
import { spring } from "@/lib/spring";

const categories = [
  { key: "all", label: "الكل" },
  { key: "tools", label: "أدوات" },
  { key: "kitchen", label: "مطبخ" },
  { key: "electronics", label: "إلكترونيات" },
  { key: "furniture", label: "أثاث" },
  { key: "books", label: "كتب" },
  { key: "sports", label: "رياضة" },
];

interface MarketSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onItemSelect: (item: any) => void;
}

export const MarketSheet = ({ isOpen, onClose, onItemSelect }: MarketSheetProps) => {
  const [tab, setTab] = useState<"neighbors" | "public">("neighbors");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading } = useItems();

  const filtered = items.filter((item) => {
    const matchSearch = item.title.includes(search) || (item.description || "").includes(search);
    const matchCat = category === "all" || item.category === category;
    return matchSearch && matchCat;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-foreground/20 z-[50]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[50] bg-card rounded-t-3xl border-t border-border shadow-2xl"
            style={{ maxHeight: "75vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <h2 className="text-lg font-bold">السوق 🛍️</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted active:scale-95 transition-transform">
                <X size={18} />
              </button>
            </div>

            {/* Tabs: جيراني / العام */}
            <div className="flex gap-2 px-4 pb-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring.tap}
                onClick={() => setTab("neighbors")}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${
                  tab === "neighbors" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                جيراني (خاص)
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring.tap}
                onClick={() => setTab("public")}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${
                  tab === "public" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                العام
              </motion.button>
            </div>

            {/* Search */}
            <div className="px-4 pb-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن غرض..."
                className="w-full h-10 pr-4 pl-4 rounded-3xl bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
              {categories.map((cat) => (
                <motion.button
                  key={cat.key}
                  whileTap={{ scale: 0.97 }}
                  transition={spring.tap}
                  onClick={() => setCategory(cat.key)}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    category === cat.key ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {cat.label}
                </motion.button>
              ))}
            </div>

            {/* Items grid */}
            <div className="overflow-y-auto px-4 pb-24" style={{ maxHeight: "45vh" }}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin text-primary text-2xl">⏳</div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p>لا توجد أغراض بعد 🔍</p>
                  <p className="text-xs mt-2">
                    {tab === "neighbors" ? "لا توجد أغراض من جيرانك حالياً" : "لا توجد إعلانات عامة حالياً"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filtered.map((item) => (
                    <ItemCard key={item.id} item={item} onClick={() => onItemSelect(item)} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
