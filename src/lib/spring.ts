// Centralized spring physics config — no linear transitions anywhere.
// Premium ease curve (out-expo style) for non-spring transitions.
export const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

export const spring = {
  // Default panel/modal open-close — interruptible, snappy
  modal: { type: "spring" as const, damping: 26, stiffness: 360, mass: 0.7 },
  // Overlay backdrop — fast fade-in
  overlay: { type: "spring" as const, damping: 32, stiffness: 420 },
  // Stagger children inside panels
  staggerChild: { type: "spring" as const, damping: 22, stiffness: 320, mass: 0.6 },
  // Button press feedback — instant return
  tap: { type: "spring" as const, damping: 15, stiffness: 600 },
  // List item entrance
  listItem: { type: "spring" as const, damping: 20, stiffness: 280, mass: 0.6 },
  // Tab indicator — crisp
  tab: { type: "spring" as const, stiffness: 550, damping: 32 },
};

// Standard tap feedback — apply to any motion.button via whileTap={tapScale}
export const tapScale = { scale: 0.96 };

// Stagger delay in seconds
export const STAGGER_DELAY = 0.02; // 20ms

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
  visible: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
};

export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 0.4 },
  exit: { opacity: 0 },
};

// Stagger container for profile/panel inner elements
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: STAGGER_DELAY, delayChildren: 0.05 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, scale: 0.92, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};
