import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { spring } from "@/lib/spring";
import { Megaphone, X } from "lucide-react";

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function AdPopup() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [shownAd, setShownAd] = useState<any | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 6000 }
    );
  }, []);

  const { data: ads = [] } = useQuery({
    queryKey: ["ads", "active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString());
      return data || [];
    },
  });

  useEffect(() => {
    if (!coords || ads.length === 0) return;
    const seen = JSON.parse(sessionStorage.getItem("seen_ads") || "[]") as string[];
    const candidate = ads.find((a: any) => {
      if (seen.includes(a.id)) return false;
      const d = distanceKm(coords.lat, coords.lng, a.location_lat, a.location_lng);
      return d <= a.radius_km;
    });
    if (candidate) {
      setShownAd(candidate);
      sessionStorage.setItem("seen_ads", JSON.stringify([...seen, candidate.id]));
    }
  }, [coords, ads]);

  return (
    <Dialog open={!!shownAd} onOpenChange={(o) => !o && setShownAd(null)}>
      <DialogContent className="glass-strong rounded-3xl border-white/10 max-w-sm p-0 overflow-hidden">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring.modal}
          className="p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Megaphone size={18} className="text-primary" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">إعلان قريب</span>
          </div>
          <DialogTitle className="text-right text-lg mb-2">{shownAd?.title}</DialogTitle>
          <p className="text-sm text-muted-foreground text-right">{shownAd?.content}</p>
          <button
            onClick={() => setShownAd(null)}
            className="mt-4 w-full h-10 rounded-2xl bg-primary text-primary-foreground text-sm font-bold gpu tap-fast"
          >
            <X size={14} className="inline ml-1" /> إغلاق
          </button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
