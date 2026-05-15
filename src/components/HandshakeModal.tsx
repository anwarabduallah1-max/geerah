import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { X, QrCode, MapPin, Loader2, Camera, Handshake, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { spring } from "@/lib/spring";

interface HandshakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUsername: string;
}

type Step = "choose" | "qr_show" | "qr_scan" | "manual_confirm" | "success" | "error";

export function HandshakeModal({ isOpen, onClose, targetUserId, targetUsername }: HandshakeModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ points: number; is_first: boolean; pair_count: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Generate a unique handshake token
  const handshakeToken = user ? `jeerah_hs:${user.id}:${targetUserId}:${Date.now()}` : "";

  useEffect(() => {
    if (isOpen) {
      setStep("choose");
      setResult(null);
      setErrorMsg("");
      setScanInput("");
    }
  }, [isOpen]);

  const getLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          resolve(loc);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const performHandshake = async (method: "qr_code" | "manual") => {
    if (!user) return;
    setLoading(true);
    try {
      const loc = await getLocation();
      const { data, error } = await supabase.rpc("perform_handshake", {
        _provider_id: targetUserId,
        _requester_id: user.id,
        _method: method,
        _lat: loc?.lat ?? null,
        _lng: loc?.lng ?? null,
      });

      if (error) throw error;

      const res = data as any;
      if (res.success) {
        setResult({ points: res.points, is_first: res.is_first, pair_count: res.pair_count });
        setStep("success");
      } else if (res.error === "cooldown") {
        const next = new Date(res.next_available);
        const hours = Math.ceil((next.getTime() - Date.now()) / 3600000);
        setErrorMsg(`يجب الانتظار ${hours} ساعة قبل المصافحة مجدداً`);
        setStep("error");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ");
      setStep("error");
    }
    setLoading(false);
  };

  const handleQrScan = () => {
    // Validate the scanned/pasted token
    if (scanInput.startsWith("jeerah_hs:") && scanInput.includes(targetUserId)) {
      performHandshake("qr_code");
    } else {
      toast.error("رمز QR غير صالح");
    }
  };

  const handleManualConfirm = async () => {
    setLoading(true);
    const loc = await getLocation();
    if (!loc) {
      setErrorMsg("يجب تفعيل الموقع الجغرافي للتأكيد اليدوي");
      setStep("error");
      setLoading(false);
      return;
    }
    // For manual: we proceed - the server-side function handles points
    performHandshake("manual");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card rounded-t-3xl border-t border-border p-6 pb-10 min-h-[50vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">🤝 مصافحة الثقة</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X size={16} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* Step: Choose method */}
            {step === "choose" && (
              <motion.div key="choose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  اختر طريقة المصافحة مع <span className="font-bold text-foreground">{targetUsername}</span>
                </p>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep("qr_show")}
                  className="w-full bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-4 text-right"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <QrCode size={24} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">مسح رمز QR</p>
                    <p className="text-xs text-muted-foreground">+10 نقاط ثقة • الطريقة الأساسية</p>
                  </div>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep("manual_confirm")}
                  className="w-full bg-muted/50 border border-border rounded-2xl p-4 flex items-center gap-4 text-right"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <MapPin size={24} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">تأكيد يدوي</p>
                    <p className="text-xs text-muted-foreground">+3 نقاط ثقة • يتطلب قرب الموقع (50م)</p>
                  </div>
                </motion.button>
              </motion.div>
            )}

            {/* Step: Show QR */}
            {step === "qr_show" && (
              <motion.div key="qr_show" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  اعرض هذا الرمز للجار ليقوم بمسحه
                </p>
                <div className="bg-background rounded-2xl p-4 border border-border">
                  <QRCodeSVG
                    value={handshakeToken}
                    size={200}
                    bgColor="transparent"
                    fgColor="hsl(220, 85%, 40%)"
                    level="M"
                  />
                </div>
                <p className="text-xs text-muted-foreground">أو اطلب من الجار إدخال الرمز يدوياً</p>
                <div className="flex gap-2 w-full">
                  <button onClick={() => setStep("qr_scan")} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5">
                    <Camera size={14} /> أنا الماسح
                  </button>
                  <button onClick={() => setStep("choose")} className="h-10 px-4 rounded-xl bg-muted text-muted-foreground text-xs font-bold">
                    رجوع
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step: Scan QR (input fallback) */}
            {step === "qr_scan" && (
              <motion.div key="qr_scan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  أدخل رمز المصافحة من جهاز الجار
                </p>
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="الصق رمز المصافحة هنا..."
                  dir="ltr"
                  className="w-full h-12 px-4 rounded-2xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-left font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleQrScan}
                    disabled={!scanInput.trim() || loading}
                    className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                    تحقق
                  </button>
                  <button onClick={() => setStep("qr_show")} className="h-10 px-4 rounded-xl bg-muted text-muted-foreground text-xs font-bold">
                    رجوع
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step: Manual Confirm */}
            {step === "manual_confirm" && (
              <motion.div key="manual" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <MapPin size={32} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  سيتم التحقق من أنكما في نفس الموقع (أقل من 50 متر)
                </p>
                <p className="text-xs text-muted-foreground/60 text-center">
                  هذه الطريقة تمنح 3 نقاط فقط مقارنة بـ 10 عبر QR
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={handleManualConfirm}
                    disabled={loading}
                    className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}
                    تأكيد المصافحة
                  </button>
                  <button onClick={() => setStep("choose")} className="h-12 px-4 rounded-xl bg-muted text-muted-foreground text-xs font-bold">
                    رجوع
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step: Success */}
            {step === "success" && result && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col items-center space-y-4 py-4"
              >
                {/* Animated handshake icon */}
                <motion.div
                  animate={{
                    rotate: [0, -15, 15, -10, 10, -5, 5, 0],
                  }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="relative"
                >
                  <div className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, hsl(220, 85%, 40%), hsl(220, 85%, 55%))" }}>
                    <Handshake size={48} className="text-primary-foreground" />
                  </div>
                  {/* Sparkle particles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: [0, (i % 2 ? 1 : -1) * (30 + i * 10)], y: [0, -(20 + i * 8)] }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                      className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                      style={{ background: "hsl(220, 85%, 40%)" }}
                    />
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-center space-y-2"
                >
                  <h3 className="text-xl font-bold">مصافحة ناجحة! 🎉</h3>
                  <p className="text-sm text-muted-foreground">
                    مع <span className="font-bold text-foreground">{targetUsername}</span>
                  </p>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: "spring", stiffness: 400 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-lg"
                    style={{ background: "linear-gradient(135deg, hsl(220, 85%, 40%), hsl(220, 85%, 55%))", color: "white" }}
                  >
                    +{result.points} نقطة ثقة
                  </motion.div>

                  {result.is_first && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.2 }}
                      className="text-xs text-primary font-bold"
                    >
                      🌟 بونص أول مصافحة! (+5 إضافية)
                    </motion.p>
                  )}
                  {result.pair_count > 3 && (
                    <p className="text-xs text-muted-foreground">
                      المصافحة رقم {result.pair_count} مع هذا الجار
                    </p>
                  )}
                </motion.div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm mt-4"
                >
                  تم ✓
                </motion.button>
              </motion.div>
            )}

            {/* Step: Error */}
            {step === "error" && (
              <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle size={32} className="text-destructive" />
                </div>
                <p className="text-sm text-center text-muted-foreground">{errorMsg}</p>
                <div className="flex gap-2 w-full">
                  <button onClick={() => setStep("choose")} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
                    حاول مجدداً
                  </button>
                  <button onClick={onClose} className="h-10 px-4 rounded-xl bg-muted text-muted-foreground text-xs font-bold">
                    إغلاق
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
