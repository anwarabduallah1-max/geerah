import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: MapPin,
    title: "جيرتك، عالمك",
    description: "اكتشف ما يقدمه جيرانك من أدوات وخدمات قريبة منك. كل شيء على بُعد خطوات.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "ثقة وأمان",
    description: "نظام تقييم وتحقق يضمن لك تعاملات آمنة. موقعك الدقيق يبقى مخفي حتى تقبل الطلب.",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    icon: Star,
    title: "ابنِ سمعتك",
    description: "كل تعامل ناجح يرفع نقاط ثقتك. كن الجار المميز في حيّك واحصل على الشارة الذهبية.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
];

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      onComplete();
    }
  };

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center max-w-sm"
        >
          <div className={`w-24 h-24 rounded-full ${slide.bg} flex items-center justify-center mb-8`}>
            <Icon size={40} className={slide.color} />
          </div>
          <h1 className="text-2xl font-bold mb-4">{slide.title}</h1>
          <p className="text-muted-foreground leading-relaxed">{slide.description}</p>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2 mt-10 mb-6">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === current ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <Button onClick={next} className="rounded-3xl px-10 h-12 text-base font-bold">
        {current < slides.length - 1 ? "التالي" : "يلا نبدأ! 🚀"}
      </Button>

      {current < slides.length - 1 && (
        <button onClick={onComplete} className="mt-4 text-sm text-muted-foreground hover:text-foreground">
          تخطي
        </button>
      )}
    </div>
  );
};
