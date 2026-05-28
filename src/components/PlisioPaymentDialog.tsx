import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, XCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { spring } from "@/lib/spring";
import { toast } from "sonner";

interface PlisioPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountSar: number;
  orderName: string;
  paymentType: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type Phase = "loading" | "iframe" | "success" | "cancel" | "error";

export function PlisioPaymentDialog({
  open,
  onOpenChange,
  amountSar,
  orderName,
  paymentType,
  onSuccess,
  onCancel,
}: PlisioPaymentDialogProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [txnId, setTxnId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Create invoice when opened
  useEffect(() => {
    if (!open) return;
    setPhase("loading");
    setInvoiceUrl(null);
    setTxnId(null);
    setErrorMsg("");

    (async () => {
      const { data, error } = await supabase.functions.invoke("plisio-create-invoice", {
        body: { amount_sar: amountSar, order_name: orderName, payment_type: paymentType },
      });
      if (error || !data?.invoice_url) {
        setPhase("error");
        setErrorMsg((error as any)?.message || "تعذّر إنشاء فاتورة الدفع");
        return;
      }
      setInvoiceUrl(data.invoice_url);
      setTxnId(data.txn_id);
      setPhase("iframe");
    })();
  }, [open, amountSar, orderName, paymentType]);

  // Poll invoice status
  useEffect(() => {
    if (phase !== "iframe" || !txnId) return;
    let cancelled = false;

    const poll = async () => {
      const { data } = await supabase.functions.invoke("plisio-invoice-status", {
        body: null,
        method: "GET" as any,
        // workaround: pass via query
      } as any).catch(() => ({ data: null }));
      // Use direct fetch instead — invoke doesn't support GET query well
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plisio-invoice-status?txn_id=${txnId}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const json = await res.json();
        if (cancelled) return;
        const s = json?.status;
        if (s === "completed") {
          setPhase("success");
          toast.success("تم استلام الدفعة بنجاح 🎉");
          onSuccess?.();
        } else if (s === "cancelled" || s === "expired" || s === "error") {
          setPhase("cancel");
          onCancel?.();
        }
      } catch {}
    };

    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, txnId, onSuccess, onCancel]);

  // Auto-close on terminal phases
  useEffect(() => {
    if (phase === "success") {
      const t = setTimeout(() => onOpenChange(false), 1800);
      return () => clearTimeout(t);
    }
  }, [phase, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-md w-[92vw] h-[80vh] max-h-[720px] rounded-3xl overflow-hidden border-white/10 bg-background">
        <DialogTitle className="sr-only">دفع آمن عبر Plisio</DialogTitle>
        <DialogDescription className="sr-only">{orderName}</DialogDescription>

        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
          <ShieldCheck size={18} className="text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{orderName}</p>
            <p className="text-[11px] text-muted-foreground">{amountSar} ر.س • دفع مشفّر آمن</p>
          </div>
        </div>

        <div className="relative flex-1 h-full bg-background">
          <AnimatePresence mode="wait">
            {phase === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              >
                <Loader2 className="animate-spin text-primary" size={28} />
                <p className="text-sm text-muted-foreground">جاري إنشاء الفاتورة...</p>
              </motion.div>
            )}

            {phase === "iframe" && invoiceUrl && (
              <motion.iframe
                key="iframe"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={spring.smooth}
                src={invoiceUrl}
                className="absolute inset-0 w-full h-full border-0"
                allow="clipboard-write; clipboard-read"
                title="Plisio Checkout"
              />
            )}

            {phase === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
              >
                <CheckCircle2 size={56} className="text-green-500" />
                <p className="font-bold">تم الدفع بنجاح</p>
                <p className="text-xs text-muted-foreground">سيتم تفعيل الخدمة خلال لحظات</p>
              </motion.div>
            )}

            {phase === "cancel" && (
              <motion.div
                key="cancel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
              >
                <XCircle size={56} className="text-destructive" />
                <p className="font-bold">تم إلغاء الدفع</p>
                <button
                  onClick={() => onOpenChange(false)}
                  className="mt-2 px-4 h-10 rounded-2xl bg-primary text-primary-foreground text-sm font-bold"
                >
                  إغلاق
                </button>
              </motion.div>
            )}

            {phase === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
              >
                <XCircle size={48} className="text-destructive" />
                <p className="font-bold text-sm">تعذّر فتح بوابة الدفع</p>
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
                <button
                  onClick={() => onOpenChange(false)}
                  className="mt-2 px-4 h-10 rounded-2xl bg-primary text-primary-foreground text-sm font-bold"
                >
                  إغلاق
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlisioPaymentDialog;
