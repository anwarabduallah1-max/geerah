import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { spring, modalVariants, overlayVariants } from "@/lib/spring";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  itemTitle: string;
  sellerId: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export const ChatModal = ({ isOpen, onClose, itemId, itemTitle, sellerId }: ChatModalProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    const initConversation = async () => {
      setLoading(true);
      try {
        // Build query to find existing conversation
        let query = supabase
          .from("conversations")
          .select("id")
          .eq("buyer_id", user.id)
          .eq("seller_id", sellerId);

        if (itemId) {
          query = query.eq("item_id", itemId);
        } else {
          query = query.is("item_id", null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
          setConversationId(existing.id);
          await loadMessages(existing.id);
        } else {
          const insertData: any = {
            buyer_id: user.id,
            seller_id: sellerId,
          };
          if (itemId) insertData.item_id = itemId;

          const { data: newConv, error } = await supabase
            .from("conversations")
            .insert(insertData)
            .select("id")
            .single();

          if (error) {
            console.error("Conversation creation error:", error);
            toast.error("تعذّر بدء المحادثة");
            setLoading(false);
            return;
          }
          setConversationId(newConv.id);
        }
      } catch (err) {
        console.error("Chat init error:", err);
        toast.error("تعذّر بدء المحادثة");
      }
      setLoading(false);
    };
    initConversation();
  }, [isOpen, user, itemId, sellerId]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, content: newMessage.trim() });
    if (error) toast.error("تعذّر إرسال الرسالة");
    else setNewMessage("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

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
            className="fixed inset-0 bg-foreground/40 z-[60]"
            onClick={onClose}
          />
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={spring.modal}
            className="fixed z-[60] bg-card shadow-2xl rounded-3xl overflow-hidden flex flex-col"
            style={{ left: "6px", right: "6px", top: "16%", bottom: "16%", maxHeight: "68vh" }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-lg shrink-0">
              <h3 className="font-bold text-sm truncate flex-1">{itemTitle}</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted active:scale-[0.95] transition-transform">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" size={24} /></div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8"><p>ابدأ المحادثة 💬</p></div>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.92, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={spring.staggerChild}
                    className={`flex ${msg.sender_id === user?.id ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${msg.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-border bg-card/95 backdrop-blur-lg shrink-0">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 h-10 px-4 rounded-full bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring.tap}
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 shrink-0"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
