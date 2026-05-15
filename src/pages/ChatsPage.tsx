import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatModal } from "@/components/ChatModal";
import { spring, staggerContainer, staggerItem } from "@/lib/spring";

interface ConversationRow {
  id: string;
  item_id: string | null;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  items: { title: string } | null;
}

export default function ChatsPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ itemId?: string; itemTitle: string; sellerId: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("conversations")
        .select("id, item_id, buyer_id, seller_id, updated_at, items(title)")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (!error && data) {
        setConversations(data as unknown as ConversationRow[]);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center pb-20">
        <div className="text-center text-muted-foreground">
          <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">سجل دخولك لرؤية محادثاتك</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="pt-4 px-4">
        <h1 className="text-xl font-bold mb-3">المحادثات 💬</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">لا توجد محادثات بعد</p>
            <p className="text-xs mt-2">ابدأ محادثة من السوق أو من ملف أحد الجيران</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
            {conversations.map((conv) => {
              const isbuyer = conv.buyer_id === user.id;
              const otherLabel = isbuyer ? "البائع" : "المشتري";
              const itemTitle = conv.items?.title || "غرض محذوف";

              return (
                <motion.div
                  key={conv.id}
                  variants={staggerItem}
                  transition={spring.listItem}
                  onClick={() =>
                    setActiveChat({
                      itemId: conv.item_id || undefined,
                      itemTitle: itemTitle,
                      sellerId: conv.seller_id,
                    })
                  }
                  className="bg-card rounded-3xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{itemTitle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">محادثة مع {otherLabel}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(conv.updated_at).toLocaleDateString("ar")}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {activeChat && (
        <ChatModal
          isOpen={!!activeChat}
          onClose={() => setActiveChat(null)}
          itemId={activeChat.itemId}
          itemTitle={activeChat.itemTitle}
          sellerId={activeChat.sellerId}
        />
      )}
    </div>
  );
}
