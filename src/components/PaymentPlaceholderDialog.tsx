import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { spring, tapScale } from "@/lib/spring";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  amount: number;
  description?: string;
  onSimulatePay?: () => void;
  isPending?: boolean;
}

const RUUL_URL = "https://ruul.com"; // TODO: replace with real Ruul checkout link

export function PaymentPlaceholderDialog({ open, onOpenChange, title, amount, description, onSimulatePay, isPending }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-3xl border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right">{title}</DialogTitle>
          <DialogDescription className="text-right">
            {description || "سيتم توجيهك إلى بوابة الدفع Ruul لإتمام العملية."}
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-4">
          <p className="text-3xl font-bold">{amount} <span className="text-base text-muted-foreground">ر.س</span></p>
        </div>
        <div className="space-y-2">
          <motion.a
            whileTap={tapScale}
            transition={spring.tap}
            href={RUUL_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-primary-foreground font-bold gpu tap-fast"
          >
            <ExternalLink size={16} /> الدفع عبر Ruul
          </motion.a>
          {onSimulatePay && (
            <Button
              variant="outline"
              className="w-full rounded-2xl"
              onClick={onSimulatePay}
              disabled={isPending}
            >
              <Wallet size={16} /> الدفع من المحفظة (تجريبي)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
