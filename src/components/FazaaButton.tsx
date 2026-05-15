import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { spring } from "@/lib/spring";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export const FazaaButton = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleFazaa = async () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    setLoading(true);
    try {
      // Check rate limit
      const { data: check } = await supabase.rpc("can_send_emergency", { p_user_id: user.id });
      const result = check as any;
      
      if (!result?.allowed) {
        toast.error(`وصلت للحد اليومي (${result?.limit || 1} تنبيه/يوم). ترقّ لباقة أعلى لمزيد من التنبيهات.`);
        setLoading(false);
        return;
      }

      // Send alert
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000 });
      });

      await supabase.from("emergency_alerts").insert({
        user_id: user.id,
        location_lat: pos?.coords.latitude || null,
        location_lng: pos?.coords.longitude || null,
      } as any);

      toast.success(`🚨 تم إرسال طلب الفزعة! متبقي: ${result.remaining - 1} تنبيه اليوم`, { duration: 4000 });
    } catch {
      toast.error("حدث خطأ أثناء الإرسال");
    }
    setLoading(false);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.tap}
      onClick={handleFazaa}
      disabled={loading}
      className="absolute bottom-24 left-4 z-[30] w-14 h-14 rounded-2xl glass-strong text-destructive shadow-soft-lg flex items-center justify-center disabled:opacity-70 ring-2 ring-destructive/40"
    >
      {loading ? <Loader2 size={24} className="animate-spin" /> : <AlertTriangle size={24} />}
    </motion.button>
  );
};
