import { useState, useEffect, useCallback } from "react";
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
  buyer_last_read_at: string;
  seller_last_read_at: string;
  items: { title: string } | null;
}

export default function ChatsPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ itemId?: string; itemTitle: string; sellerId: string } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, item_id, buyer_id, seller_id, updated_at, buyer_last_read_at, seller_last_read_at, items(title)")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });
    if (!error && data) setConversations(data as unknown as ConversationRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    load();
    // Realtime: refresh list on any new message or conversation update
    const channel = supabase
      .channel(`chats-list-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

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
              const myLastRead = isbuyer ? conv.buyer_last_read_at : conv.seller_last_read_at;
              const unread = new Date(conv.updated_at).getTime() > new Date(myLastRead).getTime();

              return (
                <motion.div
                  key={conv.id}
                  variants={staggerItem}
                  transition={spring.listItem}
                  onClick={() =>
                    setActiveChat({
                      itemId: conv.item_id || undefined,
                      itemTitle,
                      sellerId: conv.seller_id,
                    })
                  }
                  className="bg-card rounded-3xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageCircle size={20} className="text-primary" />
                    {unread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${unread ? "font-extrabold" : "font-bold"}`}>{itemTitle}</p>
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
          onClose={() => { setActiveChat(null); load(); }}
          itemId={activeChat.itemId}
          itemTitle={activeChat.itemTitle}
          sellerId={activeChat.sellerId}
        />
      )}
    </div>
  );
}
