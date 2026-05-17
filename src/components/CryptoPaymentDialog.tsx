import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import QRCode from "qrcode";
import { useQueryClient } from "@tanstack/react-query";

type Purpose = "topup" | "subscription" | "photo_slot";
type Status = "pending" | "confirming" | "confirmed" | "failed" | "expired";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  amountSar: number;
  purpose: Purpose;
  payload?: Record<string, unknown>;
  onConfirmed?: () => void;
}

interface Invoice {
  invoice_id: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
}

export function CryptoPaymentDialog({ open, onOpenChange, title, amountSar, purpose, payload, onConfirmed }: Props) {
  const qc = useQueryClient();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // Create invoice when opening
  useEffect(() => {
    if (!open) {
      setInvoice(null);
      setStatus("pending");
      setQrUrl("");
      setError(null);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    let cancelled = false;
    (async () => {
      setCreating(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke("nowpayments-create-invoice", {
        body: { purpose, amount_sar: amountSar, payload: payload ?? {} },
      });
      if (cancelled) return;
      setCreating(false);
      if (error || !data?.pay_address) {
        const msg = (data as any)?.error ? JSON.stringify((data as any).error) : error?.message || "تعذّر إنشاء الفاتورة";
        setError(msg);
        return;
      }
      setInvoice(data as Invoice);
      try {
        const url = await QRCode.toDataURL((data as Invoice).pay_address, { margin: 1, width: 220 });
        setQrUrl(url);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [open, purpose, amountSar]);

  // Poll status
  useEffect(() => {
    if (!invoice) return;
    const poll = async () => {
      const { data, error } = await supabase.functions.invoke("nowpayments-invoice-status", {
        body: { id: invoice.invoice_id },
      });
      if (error || !data) return;
      const s = (data as any).status as Status;
      setStatus(s);
      if (s === "confirmed") {
        if (pollRef.current) clearInterval(pollRef.current);
        toast.success("تم استلام الدفعة 🎉");
        qc.invalidateQueries({ queryKey: ["my-profile"] });
        qc.invalidateQueries({ queryKey: ["wallet-tx"] });
        onConfirmed?.();
        setTimeout(() => onOpenChange(false), 1500);
      } else if (s === "failed" || s === "expired") {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };
    poll();
    pollRef.current = window.setInterval(poll, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [invoice]);

  const copyAddress = async () => {
    if (!invoice) return;
    await navigator.clipboard.writeText(invoice.pay_address);
    toast.success("تم نسخ العنوان");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-3xl border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right">{title}</DialogTitle>
          <DialogDescription className="text-right">
            ادفع بعملة USDT على شبكة TRC20 (Tron) فقط. أي شبكة أخرى ستؤدي إلى فقدان الأموال.
          </DialogDescription>
        </DialogHeader>

        {creating && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">جارٍ إنشاء عنوان الدفع…</p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <XCircle className="mx-auto text-destructive mb-2" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-3 rounded-2xl" onClick={() => onOpenChange(false)}>إغلاق</Button>
          </div>
        )}

        {invoice && !creating && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-3xl font-bold">{invoice.pay_amount} <span className="text-base text-muted-foreground uppercase">{invoice.pay_currency.replace('trc20','')}</span></p>
              <p className="text-[11px] text-muted-foreground mt-1">≈ {amountSar} ر.س — شبكة TRC20</p>
            </div>

            {qrUrl && (
              <div className="flex justify-center">
                <img src={qrUrl} alt="QR" className="w-44 h-44 rounded-2xl bg-white p-2" />
              </div>
            )}

            <div className="glass rounded-2xl p-3 flex items-center gap-2">
              <code className="flex-1 text-[10px] break-all text-left ltr:text-left" dir="ltr">{invoice.pay_address}</code>
              <Button size="icon" variant="ghost" className="shrink-0" onClick={copyAddress}>
                <Copy size={14} />
              </Button>
            </div>

            <StatusBadge status={status} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; icon: any; cls: string }> = {
    pending: { label: "بانتظار الدفع", icon: Clock, cls: "bg-muted/40 text-muted-foreground" },
    confirming: { label: "جاري التأكيد على الشبكة…", icon: Loader2, cls: "bg-primary/15 text-primary" },
    confirmed: { label: "تم التأكيد ✓", icon: CheckCircle2, cls: "bg-primary text-primary-foreground" },
    failed: { label: "فشل الدفع", icon: XCircle, cls: "bg-destructive/15 text-destructive" },
    expired: { label: "انتهت صلاحية الفاتورة", icon: XCircle, cls: "bg-destructive/15 text-destructive" },
  };
  const { label, icon: Icon, cls } = map[status];
  return (
    <div className={`flex items-center justify-center gap-2 rounded-2xl py-2 text-xs font-bold ${cls}`}>
      <Icon size={14} className={status === "confirming" ? "animate-spin" : ""} /> {label}
    </div>
  );
}
