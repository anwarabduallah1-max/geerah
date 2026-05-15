import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { spring, tapScale } from "@/lib/spring";
import { toast } from "sonner";

interface Props {
  targetType: "profile" | "item" | "news";
  targetId: string;
  points?: number;
  className?: string;
}

export function BoostButton({ targetType, targetId, points = 50, className }: Props) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("boost_target", {
        p_target_type: targetType,
        p_target_id: targetId,
        p_points: points,
      });
      if (error) throw error;
      const r = data as any;
      if (!r?.success) throw new Error(r?.error === "insufficient_points" ? "نقاطك غير كافية" : r?.error || "فشل");
    },
    onSuccess: () => {
      toast.success(`تم تثبيت العرض في الأعلى لمدة 24 ساعة`);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["boosts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <motion.button
      whileTap={tapScale}
      transition={spring.tap}
      onClick={() => m.mutate()}
      disabled={m.isPending}
      className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-2xl glass-strong text-primary gpu tap-fast ${className || ""}`}
    >
      <Rocket size={12} /> تعزيز ({points} نقطة)
    </motion.button>
  );
}
