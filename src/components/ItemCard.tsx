import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Tag, MessageCircle, User, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ChatModal } from "@/components/ChatModal";
import { toast } from "sonner";
import { spring } from "@/lib/spring";
import type { Tables } from "@/integrations/supabase/types";

type Item = Tables<"items"> & {
  owner?: { username: string; avatar_url: string | null };
};

interface ItemCardProps {
  item: Item;
  onClick?: () => void;
}

const priceLabels: Record<string, string> = { free: "مجاني", borrow: "استعارة", for_sale: "للبيع" };
const categoryLabels: Record<string, string> = {
  tools: "أدوات", kitchen: "مطبخ", electronics: "إلكترونيات",
  furniture: "أثاث", books: "كتب", sports: "رياضة", other: "أخرى",
};

// Haversine distance in meters
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m / 10) * 10} م`;
  return `${(m / 1000).toFixed(1)} كم`;
}

export const ItemCard = ({ item, onClick }: ItemCardProps) => {
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const isOwnItem = user?.id === item.owner_id;
  const isReserved = item.status === "busy";

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("user_loc");
      if (cached) setUserLoc(JSON.parse(cached));
    } catch {}
    const handler = (e: Event) => {
      const { lat, lng } = (e as CustomEvent).detail;
      const loc = { lat, lng };
      setUserLoc(loc);
      try { sessionStorage.setItem("user_loc", JSON.stringify(loc)); } catch {}
    };
    window.addEventListener("locate-me", handler);
    return () => window.removeEventListener("locate-me", handler);
  }, []);

  const distance =
    userLoc && item.location_lat && item.location_lng
      ? distanceMeters(userLoc.lat, userLoc.lng, item.location_lat, item.location_lng)
      : null;

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    setChatOpen(true);
  };

  // Reserved items get terra-cotta accent ring/border
  const statusBadge = isReserved
    ? { label: "محجوز", classes: "bg-accent text-accent-foreground" }
    : { label: "متاح", classes: "bg-[hsl(var(--status-available))] text-primary-foreground" };

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.97 }}
        transition={spring.tap}
        onClick={onClick}
        className={`bg-card rounded-3xl border overflow-hidden shadow-soft cursor-pointer hover:shadow-soft-md transition-all duration-300 relative ${
          isReserved ? "border-accent/40 ring-1 ring-accent/30" : "border-border/40"
        }`}
      >
        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Tag size={32} className="text-muted-foreground/50" />
            </div>
          )}
          {/* Availability status pill (no legend needed — color matches map pin) */}
          <span className={`absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadge.classes}`}>
            {isReserved && <Lock size={10} />}
            {statusBadge.label}
          </span>
          {/* Price-type chip */}
          <span className="absolute top-2 left-2 glass text-[10px] font-bold px-2.5 py-1 rounded-full text-primary">
            {priceLabels[item.price_type] || item.price_type}
          </span>
        </div>

        <div className="p-3 space-y-1.5">
          {/* Tool name */}
          <h3 className="font-bold text-sm truncate text-card-foreground" title={item.title}>
            {item.title}
          </h3>

          {/* Owner name */}
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <User size={12} />
            <span className="truncate">{item.owner?.username || "جار"}</span>
          </div>

          {/* Distance + category row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              {distance != null && (
                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                  <MapPin size={12} />
                  {formatDistance(distance)}
                </span>
              )}
              <span className="text-muted-foreground">
                {categoryLabels[item.category] || item.category}
              </span>
            </div>
            {!isOwnItem && user && !isReserved && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring.tap}
                onClick={handleChatClick}
                aria-label="محادثة"
                className="p-1.5 rounded-full bg-accent/15 hover:bg-accent/25 transition-colors"
              >
                <MessageCircle size={14} className="text-accent" />
              </motion.button>
            )}
          </div>

          {item.price_type === "for_sale" && item.price_value && item.price_value > 0 && (
            <p className="text-accent font-bold text-sm">{item.price_value} ر.س</p>
          )}
        </div>
      </motion.div>
      <ChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        itemId={item.id}
        itemTitle={item.title}
        sellerId={item.owner_id}
      />
    </>
  );
};
