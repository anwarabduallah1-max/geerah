import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { spring, tapScale, staggerContainer, staggerItem } from "@/lib/spring";
import { CryptoPaymentDialog } from "@/components/CryptoPaymentDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function WalletCard() {
  const { user } = useAuth();
  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState<number>(50);
  const [confirmed, setConfirmed] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_profile");
      return (data as any[])?.[0] ?? null;
    },

  });

  const { data: txs = [] } = useQuery({
    queryKey: ["wallet-tx", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const balance = Number(profile?.wallet_balance || 0);

  const openTopup = () => {
    setConfirmed(true);
    setTopupOpen(true);
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
      <motion.div
        variants={staggerItem}
        transition={spring.staggerChild}
        className="glass-strong rounded-3xl p-5 shadow-soft-lg gpu"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-primary" />
            <span className="text-sm font-bold">محفظتي</span>
          </div>
        </div>
        <p className="text-3xl font-bold">{balance.toFixed(2)} <span className="text-base text-muted-foreground">ر.س</span></p>
        <p className="text-[11px] text-muted-foreground mt-1">عمولة خدمة التوصيل: 13% تُخصم تلقائيًا عند إتمام الطلب</p>

        <div className="mt-4 flex items-center gap-2">
          <Input
            type="number"
            min={150}
            max={1000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="rounded-2xl text-right"
            placeholder="المبلغ بالريال"
          />
          <motion.button
            whileTap={tapScale}
            transition={spring.tap}
            onClick={openTopup}
            disabled={!amount || amount < 150 || amount > 1000}
            className="inline-flex items-center gap-1 text-xs font-bold px-4 h-10 rounded-2xl bg-primary text-primary-foreground disabled:opacity-50 gpu tap-fast shrink-0"
          >
            <Plus size={14} /> شحن USDT
          </motion.button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">الحد الأدنى 150 ر.س — يُدفع عبر USDT (TRC20)</p>
      </motion.div>

      <motion.div variants={staggerItem} transition={spring.staggerChild} className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground px-2">آخر العمليات</p>
        {txs.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-6 glass rounded-3xl">لا توجد عمليات بعد</div>
        )}
        {txs.map((tx: any) => {
          const positive = Number(tx.amount) >= 0;
          return (
            <div key={tx.id} className="glass rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${positive ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                  {positive ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                </div>
                <div>
                  <p className="text-xs font-medium">{tx.note || tx.type}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("ar")}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${positive ? "text-primary" : "text-destructive"}`}>
                {positive ? "+" : ""}{Number(tx.amount).toFixed(2)}
              </span>
            </div>
          );
        })}
      </motion.div>

      {confirmed && (
        <CryptoPaymentDialog
          open={topupOpen}
          onOpenChange={(o) => { setTopupOpen(o); if (!o) setConfirmed(false); }}
          title="شحن المحفظة"
          amountSar={amount}
          purpose="topup"
        />
      )}
    </motion.div>
  );
}
