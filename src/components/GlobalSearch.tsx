import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Package, Users, Newspaper, Truck, Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { spring } from "@/lib/spring";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

interface SearchResult {
  id: string;
  type: "item" | "neighbor" | "news" | "jeera_box" | "delivery";
  title: string;
  subtitle?: string;
  icon: typeof Package;
}

const typeIcons = { item: Package, neighbor: Users, news: Newspaper, jeera_box: Gift, delivery: Truck };
const typeLabels = { item: "غرض", neighbor: "جار", news: "خبر", jeera_box: "تبرع", delivery: "توصيل" };

export const GlobalSearch = ({ isOpen, onClose, onNavigate }: GlobalSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = query.trim();
      const all: SearchResult[] = [];

      const [items, profiles, news, box, deliveries] = await Promise.all([
        supabase.from("items").select("id, title, category").ilike("title", `%${q}%`).limit(5),
        supabase.from("profiles").select("id, user_id, username, bio").or(`username.ilike.%${q}%,bio.ilike.%${q}%`).limit(5),
        supabase.from("news").select("id, title").ilike("title", `%${q}%`).limit(5),
        supabase.from("jeera_box").select("id, title, category").ilike("title", `%${q}%`).is("claimed_by", null).limit(5),
        supabase.from("delivery_requests").select("id, title, status").ilike("title", `%${q}%`).eq("status", "open").limit(5),
      ]);

      items.data?.forEach((i) => all.push({ id: i.id, type: "item", title: i.title, subtitle: i.category, icon: Package }));
      profiles.data?.forEach((p) => all.push({ id: p.id, type: "neighbor", title: p.username, subtitle: p.bio || undefined, icon: Users }));
      news.data?.forEach((n) => all.push({ id: n.id, type: "news", title: n.title, icon: Newspaper }));
      box.data?.forEach((b) => all.push({ id: b.id, type: "jeera_box", title: b.title, subtitle: b.category, icon: Gift }));
      deliveries.data?.forEach((d) => all.push({ id: d.id, type: "delivery", title: d.title, icon: Truck }));

      setResults(all);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    onClose();
    if (r.type === "item") onNavigate("/");
    else if (r.type === "neighbor") onNavigate("/neighbors");
    else if (r.type === "news") onNavigate("/neighbors");
    else if (r.type === "jeera_box") onNavigate("/jeera-box");
    else if (r.type === "delivery") onNavigate("/delivery");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm flex flex-col"
        >
          <div className="p-4 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في كل شيء..."
                className="w-full h-12 pr-10 pl-4 rounded-2xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button onClick={() => { setQuery(""); onClose(); }} className="p-2 rounded-full hover:bg-muted">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-20">
            {loading && (
              <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary" /></div>
            )}
            {!loading && query && results.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <Search size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد نتائج لـ "{query}"</p>
              </div>
            )}
            {!loading && results.length > 0 && (
              <div className="space-y-2">
                {results.map((r) => {
                  const Icon = typeIcons[r.type];
                  return (
                    <motion.button
                      key={`${r.type}-${r.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleSelect(r)}
                      className="w-full bg-card rounded-2xl border border-border p-3 flex items-center gap-3 text-right active:scale-[0.98] transition-transform"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-[10px] text-muted-foreground">{typeLabels[r.type]}{r.subtitle ? ` • ${r.subtitle}` : ""}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
            {!query && (
              <div className="text-center text-muted-foreground py-12">
                <Search size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">ابحث عن أغراض، جيران، أخبار، تبرعات، أو طلبات توصيل</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
