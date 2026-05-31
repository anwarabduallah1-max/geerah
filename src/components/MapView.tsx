import { useEffect, useRef, useCallback, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Item = Tables<"items">;

const LOCATIONIQ_TOKEN = "pk.804c471026d0d8f32786352e7cebedf0";
const DEFAULT_CENTER: L.LatLngExpression = [35.95, 39.01];
const DEFAULT_ZOOM = 14;

// Minimalist light theme — fewer POIs, cleaner roads
const TILE_URL_LIGHT = `https://tiles.locationiq.com/v3/light_nolabels/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_TOKEN}`;
const TILE_URL_LABELS = `https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_TOKEN}&lang=ar`;

interface MapViewProps {
  items: Item[];
  onItemSelect: (item: Item) => void;
}

// Pin colors mapped to data status — eliminates need for a legend
// available → sage green, busy/reserved → terra cotta, nearby → dark brown
type PinKind = "available" | "reserved" | "nearby" | "demo";
const PIN_COLORS: Record<PinKind, { bg: string; ring: string; emoji: string }> = {
  available: { bg: "#4F7A4A", ring: "#D7E4D2", emoji: "🛠️" }, // sage green
  reserved:  { bg: "#C75A3C", ring: "#F4D9CE", emoji: "🔒" }, // terra cotta
  nearby:    { bg: "#5B3A24", ring: "#E6D6C7", emoji: "📍" }, // dark brown
  demo:      { bg: "#4F7A4A", ring: "#D7E4D2", emoji: "🔧" },
};

const createItemIcon = (kind: PinKind) => {
  const c = PIN_COLORS[kind];
  const size = kind === "nearby" ? 42 : 36;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${c.bg};
      border:3px solid ${c.ring};
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:${kind === "nearby" ? 16 : 14}px;font-weight:bold;
      box-shadow:0 2px 8px rgba(40,20,10,0.35);
      transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
      cursor:pointer;
    ">${c.emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const locationIcon = L.divIcon({
  className: "user-location-marker-wrap",
  html: `<div class="user-location-marker">
    <span class="ulm-halo"></span>
    <span class="ulm-halo delay"></span>
    <span class="ulm-core"></span>
  </div>`,
  iconSize: [28, 36],
  iconAnchor: [14, 32],
});

function MapViewInner({ items, onItemSelect }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const locationMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const m = L.map(mapContainer.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    const tileLayer = L.tileLayer(TILE_URL_LIGHT, {
      maxZoom: 19,
      keepBuffer: 4,
      updateWhenZooming: false,
      updateWhenIdle: true,
    }).addTo(m);

    // Light label overlay — only major streets/landmarks
    L.tileLayer(TILE_URL_LABELS, {
      maxZoom: 19,
      opacity: 0.55,
      pane: "shadowPane",
    }).addTo(m);

    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(m);

    markersLayer.current = L.layerGroup().addTo(m);
    map.current = m;

    // Force proper sizing after lazy-load mount
    m.whenReady(() => {
      m.invalidateSize();
      tileLayer.redraw();
    });

    // Staggered invalidateSize to fix grey/white tile gaps
    const timers = [0, 150, 400, 1000, 2000].map((ms) =>
      setTimeout(() => {
        m.invalidateSize();
        if (ms >= 1000) tileLayer.redraw();
      }, ms)
    );

    // ResizeObserver for dynamic container changes
    const container = mapContainer.current;
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => m.invalidateSize());
      ro.observe(container);
    }

    return () => {
      timers.forEach(clearTimeout);
      ro?.disconnect();
      m.remove();
      map.current = null;
      markersLayer.current = null;
    };
  }, []);

  const updateMarkers = useCallback(() => {
    if (!map.current || !markersLayer.current) return;
    markersLayer.current.clearLayers();

    // Get user location for proximity check
    const userLat = locationMarker.current?.getLatLng()?.lat;
    const userLng = locationMarker.current?.getLatLng()?.lng;



    items
      .filter((i) => i.location_lat && i.location_lng)
      .forEach((item) => {
        // Determine pin kind from item.status + proximity
        let kind: PinKind = item.status === "busy" ? "reserved" : "available";
        if (kind === "available" && userLat && userLng) {
          const dist = Math.sqrt(
            Math.pow(item.location_lat! - userLat, 2) +
            Math.pow(item.location_lng! - userLng, 2)
          );
          if (dist < 0.005) kind = "nearby"; // ~500m
        }

        const marker = L.marker([item.location_lat!, item.location_lng!], {
          icon: createItemIcon(kind),
        });
        marker.on("click", () => {
          const el = marker.getElement();
          if (el) {
            el.style.transition = "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)";
            el.style.transform = "scale(1.4)";
            setTimeout(() => { el.style.transform = "scale(1)"; }, 350);
          }
          onItemSelect(item);
        });
        markersLayer.current!.addLayer(marker);
      });
  }, [items, onItemSelect]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { lng, lat } = (e as CustomEvent).detail;
      if (!map.current) return;
      map.current.flyTo([lat, lng], 16, { duration: 1.5 });

      if (locationMarker.current) {
        locationMarker.current.remove();
      }
      locationMarker.current = L.marker([lat, lng], { icon: locationIcon }).addTo(map.current);
    };
    window.addEventListener("locate-me", handler);
    return () => window.removeEventListener("locate-me", handler);
  }, []);

  return <div ref={mapContainer} className="w-full h-full" style={{ transform: "translate3d(0,0,0)" }} />;
}

export const MapView = memo(MapViewInner);
