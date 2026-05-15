import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { spring, tapScale } from "@/lib/spring";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

const RADII = [1, 2, 3] as const;

export function AdComposer({ canPublish }: { canPublish: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [radius, setRadius] = useState<1 | 2 | 3>(1);

  const createAd = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("سجّل دخولك أولاً");
      // get current location
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      const { error } = await supabase.from("ads").insert({
        user_id: user.id,
        title,
        content,
        radius_km: radius,
        location_lat: pos.coords.latitude,
        location_lng: pos.coords.longitude,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم نشر الإعلان");
      setTitle(""); setContent("");
      qc.invalidateQueries({ queryKey: ["ads"] });
      qc.invalidateQueries({ queryKey: ["my-ads"] });
    },
    onError: (e: any) => toast.error(e.message || "فشل النشر"),
  });

  if (!canPublish) {
    return (
      <div className="glass rounded-3xl p-5 text-center">
        <Megaphone size={28} className="text-primary mx-auto mb-2" />
        <p className="text-sm font-bold mb-1">إعلانات الأعمال</p>
        <p className="text-xs text-muted-foreground">يتطلب اشتراك تجاري لنشر إعلانات على الخريطة.</p>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-3xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-primary" />
        <p className="font-bold text-sm">إنشاء إعلان جديد</p>
      </div>
      <Input placeholder="عنوان الإعلان" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="محتوى الإعلان" value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
      <div>
        <p className="text-xs text-muted-foreground mb-2">نصف قطر الوصول</p>
        <div className="grid grid-cols-3 gap-2">
          {RADII.map((r) => (
            <motion.button
              key={r}
              whileTap={tapScale}
              transition={spring.tap}
              onClick={() => setRadius(r)}
              className={`h-10 rounded-2xl text-sm font-bold tap-fast gpu ${radius === r ? "bg-primary text-primary-foreground" : "glass"}`}
            >
              {r} كم
            </motion.button>
          ))}
        </div>
      </div>
      <Button
        onClick={() => createAd.mutate()}
        disabled={!title || !content || createAd.isPending}
        className="w-full rounded-2xl"
      >
        نشر الإعلان
      </Button>
    </div>
  );
}
