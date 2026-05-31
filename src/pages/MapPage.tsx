import { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingSearch } from "@/components/FloatingSearch";
import { FazaaButton } from "@/components/FazaaButton";
import { SlideOverPanel } from "@/components/SlideOverPanel";
import { MarketSheet } from "@/components/MarketSheet";
import { AddItemDrawer } from "@/components/AddItemDrawer";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ActiveDeliveryOverlay } from "@/components/ActiveDeliveryOverlay";
import { AdPopup } from "@/components/AdPopup";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, LocateFixed, Plus, ShoppingBag } from "lucide-react";
import { useItems, useRequestItem } from "@/hooks/useItems";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { spring, tapScale } from "@/lib/spring";
import type { Tables } from "@/integrations/supabase/types";
import { MapView } from "@/components/MapView";

type Item = Tables<"items">;

const FilterToggle = memo(({ mode, onChange }: { mode: "public" | "private"; onChange: (m: "public" | "private") => void }) => (
  <div className="flex rounded-full glass-strong shadow-soft-md p-0.5 w-40 mx-auto gpu">
    {(["public", "private"] as const).map((m) => (
      <button
        key={m}
        onClick={() => onChange(m)}
        className={`relative flex-1 py-1 text-xs font-bold rounded-full z-10 transition-colors tap-fast ${
          mode === m ? "text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        {mode === m && (
          <motion.div
            layoutId="togglePill"
            className="absolute inset-0 bg-primary rounded-full"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10">{m === "public" ? "السوق" : "جيراني"}</span>
      </button>
    ))}
  </div>
));

FilterToggle.displayName = "FilterToggle";

export default function MapPage() {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [filterMode, setFilterMode] = useState<"public" | "private">("public");
  const { user } = useAuth();
  const requestItem = useRequestItem();

  const { data: items = [] } = useItems();

  const filteredItems = items.filter(
    (item) =>
      item.title.includes(searchQuery) || item.category.includes(searchQuery)
  );

  const handleItemSelect = useCallback((item: Item) => {
    setSelectedItem(item);
    setShowMarket(false);
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.dispatchEvent(
          new CustomEvent("locate-me", {
            detail: { lng: pos.coords.longitude, lat: pos.coords.latitude },
          })
        );
        setLocating(false);
      },
      () => {
        toast.error("تعذّر تحديد موقعك");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleRequest = (itemId: string) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }
    requestItem.mutate(itemId, {
      onSuccess: () => setSelectedItem(null),
    });
  };

  return (
    <div className="relative w-full h-full gpu">
      {/* Map fills the container — isolated from overlays for stable repaints */}
      <div className="absolute inset-0 z-[1] layer-isolate">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center bg-muted/30">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          }
        >
          <MapView items={filteredItems} onItemSelect={handleItemSelect} />
        </Suspense>
      </div>

      {/* Floating search - tap opens global search */}
      <div className="absolute top-4 left-4 right-4 z-[30]" onClick={() => setShowGlobalSearch(true)}>
        <FloatingSearch onSearch={setSearchQuery} />
      </div>

      {/* Control buttons - right side */}
      <div className="absolute top-20 right-4 z-[30] flex flex-col gap-2">
        <motion.button
          whileTap={tapScale}
          transition={spring.tap}
          onClick={handleLocateMe}
          disabled={locating}
          className="w-11 h-11 rounded-2xl glass-strong flex items-center justify-center disabled:opacity-50 gpu tap-fast shadow-soft-md"
        >
          {locating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <LocateFixed size={18} className="text-primary" />
          )}
        </motion.button>
      </div>

      {/* Compact public/private toggle - above FABs */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[30]">
        <FilterToggle mode={filterMode} onChange={setFilterMode} />
      </div>

      {/* Market FAB */}
      <motion.button
        whileTap={tapScale}
        transition={spring.tap}
        onClick={() => setShowMarket(true)}
        className="absolute bottom-6 right-4 z-[30] w-14 h-14 rounded-2xl glass-strong text-primary shadow-soft-lg flex items-center justify-center gpu tap-fast"
      >
        <ShoppingBag size={24} />
      </motion.button>

      {/* Add item FAB — Terra Cotta CTA (primary action: "Add Tool") */}
      <motion.button
        whileTap={tapScale}
        transition={spring.tap}
        onClick={() => {
          if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
          setShowAddItem(true);
        }}
        aria-label="أضف أداة"
        className="absolute bottom-6 left-4 z-[30] w-14 h-14 rounded-2xl bg-accent text-accent-foreground shadow-soft-lg flex items-center justify-center gpu tap-fast hover:bg-accent/90"
      >
        <Plus size={24} />
      </motion.button>

      <FazaaButton />

      {/* Active delivery tracking overlay (only shown when user has accepted delivery) */}
      <ActiveDeliveryOverlay />
      <AdPopup />

      {/* Market sheet overlay */}
      <MarketSheet
        isOpen={showMarket}
        onClose={() => setShowMarket(false)}
        onItemSelect={handleItemSelect}
      />

      {/* Add item drawer */}
      <AddItemDrawer
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
      />

      {/* Item detail panel */}
      <SlideOverPanel
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title || ""}
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-3xl flex items-center justify-center">
              <span className="text-4xl">📦</span>
            </div>
            <div>
              <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-2">
                {selectedItem.price_type === "free"
                  ? "مجاني"
                  : selectedItem.price_type === "borrow"
                  ? "استعارة"
                  : `${selectedItem.price_value} ر.س`}
              </span>
              <p className="text-muted-foreground text-sm">
                {selectedItem.description}
              </p>
            </div>
            <div className="bg-muted/50 rounded-3xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">📍 المنطقة الآمنة</p>
              <p className="text-xs text-muted-foreground">الموقع الدقيق يظهر بعد قبول الطلب</p>
            </div>
            <button
              onClick={() => handleRequest(selectedItem.id)}
              disabled={requestItem.isPending || selectedItem.owner_id === user?.id || selectedItem.status === "busy"}
              className="w-full h-12 bg-accent text-accent-foreground rounded-3xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors"
            >
              {requestItem.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : selectedItem.owner_id === user?.id ? (
                "هذا غرضك"
              ) : selectedItem.status === "busy" ? (
                "محجوز حالياً"
              ) : (
                "اطلب هذا الغرض"
              )}
            </button>
          </div>
        )}
      </SlideOverPanel>

      {/* Global search overlay */}
      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onNavigate={(path) => navigate(path)}
      />
    </div>
  );
}
