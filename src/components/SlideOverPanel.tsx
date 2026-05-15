import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { spring, modalVariants, overlayVariants } from "@/lib/spring";

interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export const SlideOverPanel = ({ isOpen, onClose, children, title }: SlideOverPanelProps) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={spring.overlay}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 gpu-opacity"
            onClick={onClose}
          />
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={spring.modal}
            className="fixed inset-x-0 z-50 glass-strong shadow-soft-lg overflow-y-auto rounded-3xl mx-2 gpu layer-isolate"
            style={{ top: "16%", bottom: "16%", maxHeight: "68vh" }}
          >
            <div className="sticky top-0 glass-strong z-10 flex items-center justify-between p-4 border-b border-border/30 rounded-t-3xl">
              {title && <h2 className="text-lg font-bold tracking-tight">{title}</h2>}
              <button onClick={onClose} className="p-2 rounded-2xl hover:bg-muted press tap-fast">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
