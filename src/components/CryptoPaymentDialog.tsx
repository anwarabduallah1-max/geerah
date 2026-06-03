import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink, CreditCard } from "lucide-react";
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
  invoice_url: string;
  txn_id: string;
  pay_amount?: number;
  pay_currency?: string;
}

export function CryptoPaymentDialog({ open, onOpenChange, title, amountSar, purpose, payload, onConfirmed }: Props) {
  const qc = useQueryClient();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setInvoice(null);
      setStatus("pending");
      setError(null);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    let cancelled = false;
    (async () => {
      setCreating(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke("plisio-create-invoice", {
        body: { purpose, amount_sar: amountSar, payload: payload ?? {} },
      });
      if (cancelled) return;
      setCreating(false);
      if (error || !data?.invoice_url) {
        const msg = (data as any)?.error ? JSON.stringify((data as any).error) : error?.message || "تعذّر إنشاء الفاتورة";
        setError(msg);
        return;
      }
      setInvoice(data as Invoice);
      // Auto-open Plisio's hosted invoice in a new tab so the user can pay by card or crypto
      try { window.open((data as Invoice).invoice_url, "_blank", "noopener,noreferrer"); } catch {}
    })();
    return () => { cancelled = true; };
  }, [open, purpose, amountSar]);

  // Poll status (server polls Plisio for us if still pending)
  useEffect(() => {
    if (!invoice) return;
    let active = true;
    const poll = async () => {
      const { data } = await supabase.functions.invoke("plisio-invoice-status", { body: { id: invoice.invoice_id } });
      if (!active || !data) return;
      const raw = (data as any).status as string;
      const s: Status =
        raw === "confirmed" ? "confirmed" :
        raw === "confirming" ? "confirming" :
        raw === "failed" ? "failed" :
        raw === "expired" ? "expired" :
        "pending";
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
    pollRef.current = window.setInterval(poll, 6000);
    return () => { active = false; if (pollRef.current) clearInterval(pollRef.current); };
  }, [invoice]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-3xl border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right">{title}</DialogTitle>
          <DialogDescription className="text-right">
            ادفع بأمان عبر بوابة Plisio — بطاقة ائتمان/خصم أو عملة رقمية. سيتم تأكيد الدفعة تلقائيًا.
          </DialogDescription>
        </DialogHeader>

        {creating && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">جارٍ إنشاء فاتورة الدفع…</p>
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
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{amountSar} <span className="text-base text-muted-foreground">ر.س</span></p>
              <p className="text-[11px] text-muted-foreground mt-1">≈ {(amountSar * 0.2667).toFixed(2)} USD</p>
            </div>

            <Button
              className="w-full rounded-2xl h-12 gap-2"
              onClick={() => window.open(invoice.invoice_url, "_blank", "noopener,noreferrer")}
            >
              <CreditCard size={16} /> ادفع الآن <ExternalLink size={14} />
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              تفتح صفحة الدفع في نافذة جديدة. اختر "بطاقة ائتمان" داخل صفحة Plisio لإتمام الدفع بالفيزا/ماستركارد.
            </p>

            <StatusBadge status={status} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; icon: any; cls: string }> = {
    pending: { label: "بانتظار الدفع…", icon: Clock, cls: "bg-muted/40 text-muted-foreground" },
    confirming: { label: "جاري التأكيد…", icon: Loader2, cls: "bg-primary/15 text-primary" },
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
