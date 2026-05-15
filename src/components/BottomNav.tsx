import { useLocation, useNavigate } from "react-router-dom";
import { Map, MessageCircle, Users, UserCircle } from "lucide-react";
import { motion } from "framer-motion";
import { memo } from "react";
import { spring, tapScale } from "@/lib/spring";

const tabs = [
  { path: "/profile", label: "ملفي", icon: UserCircle },
  { path: "/chats", label: "محادثات", icon: MessageCircle },
  { path: "/neighbors", label: "جيراني", icon: Users },
  { path: "/", label: "الخريطة", icon: Map },
];

const BottomNavInner = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-3 left-3 right-3 z-[999] glass-strong rounded-3xl safe-area-bottom shadow-soft-lg gpu layer-isolate"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.path}
              whileTap={tapScale}
              transition={spring.tap}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full gpu tap-fast"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 w-6 h-1 rounded-full bg-primary"
                  transition={spring.tab}
                />
              )}
              <Icon size={22} className={isActive ? "text-primary" : "text-foreground"} />
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export const BottomNav = memo(BottomNavInner);
