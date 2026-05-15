import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlideOverPanel } from "@/components/SlideOverPanel";
import { ChatModal } from "@/components/ChatModal";
import { Shield, Star, MessageCircle, Newspaper, Loader2, Users, Search, Plus, X, Send, Handshake, ThumbsUp, Crown, Gift, ImagePlus, Megaphone } from "lucide-react";
import { AdminPanel } from "@/components/AdminPanel";
import { HandshakeModal } from "@/components/HandshakeModal";
import { JeeraBoxSection } from "@/components/JeeraBoxSection";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { spring, staggerContainer, staggerItem, tapScale } from "@/lib/spring";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type News = Tables<"news">;

interface NeighborWithItems extends Profile {
  itemCount: number;
  approvalCount?: number;
}

function useNeighbors() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["neighbors", user?.id],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("user_id", user?.id ?? "")
        .order("trust_score", { ascending: false });

      if (error) throw error;

      const [itemsRes, approvalsRes] = await Promise.all([
        supabase.from("items").select("owner_id").eq("status", "available"),
        supabase.from("admin_approvals").select("candidate_id"),
      ]);

      const countMap: Record<string, number> = {};
      itemsRes.data?.forEach((item) => { countMap[item.owner_id] = (countMap[item.owner_id] || 0) + 1; });

      const approvalMap: Record<string, number> = {};
      approvalsRes.data?.forEach((a: any) => { approvalMap[a.candidate_id] = (approvalMap[a.candidate_id] || 0) + 1; });

      return (profiles || []).map((p) => ({
        ...p,
        itemCount: countMap[p.user_id] || 0,
        approvalCount: approvalMap[p.user_id] || 0,
      })) as NeighborWithItems[];
    },
    enabled: !!user,
  });
}

function useNews() {
  return useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as News[];
    },
  });
}

function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });
}

function useAddNews() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ title, content, imageUrl, isOfficial }: { title: string; content: string; imageUrl?: string | null; isOfficial?: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("news").insert({
        author_id: user.id,
        title,
        content,
        image_url: imageUrl || null,
        is_official: !!isOfficial,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("تم نشر الخبر بنجاح");
    },
    onError: () => toast.error("تعذّر نشر الخبر"),
  });
}

export default function NeighborsPage() {
  const [selectedNeighbor, setSelectedNeighbor] = useState<NeighborWithItems | null>(null);
  const [tab, setTab] = useState<"neighbors" | "box" | "news" | "admin">("neighbors");
  const [chatTarget, setChatTarget] = useState<NeighborWithItems | null>(null);
  const [handshakeTarget, setHandshakeTarget] = useState<NeighborWithItems | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddNews, setShowAddNews] = useState(false);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsImage, setNewsImage] = useState<string>("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const { user } = useAuth();
  const { data: myProfile } = useMyProfile();
  const { data: neighbors = [], isLoading: neighborsLoading } = useNeighbors();
  const { data: news = [], isLoading: newsLoading } = useNews();
  const addNews = useAddNews();
  const queryClient = useQueryClient();
  const isAdmin = (myProfile as any)?.is_admin === true;

  const approveNeighbor = useMutation({
    mutationFn: async (candidateId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("admin_approvals").insert({
        candidate_id: candidateId,
        approver_id: user.id,
      } as any);
      if (error) {
        if (error.code === "23505") throw new Error("already_approved");
        throw error;
      }
      // Check if they now have 5 approvals
      await supabase.rpc("check_admin_status", { p_candidate_id: candidateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["neighbors"] });
      toast.success("تم التصويت! ✅");
    },
    onError: (err: any) => {
      if (err.message === "already_approved") toast.info("سبق أن صوّت لهذا الجار");
      else toast.error("حدث خطأ");
    },
  });

  const filteredNeighbors = neighbors.filter((n) =>
    searchQuery
      ? n.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.bio && n.bio.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
  );

  const handleStartChat = (neighbor: NeighborWithItems) => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    setChatTarget(neighbor);
    setSelectedNeighbor(null);
  };

  const handlePostNews = () => {
    if (!newsTitle.trim() || !newsContent.trim()) {
      toast.error("يرجى ملء العنوان والمحتوى");
      return;
    }
    addNews.mutate(
      { title: newsTitle.trim(), content: newsContent.trim(), imageUrl: newsImage || null, isOfficial: isAdmin },
      { onSuccess: () => { setNewsTitle(""); setNewsContent(""); setNewsImage(""); setShowAddNews(false); } }
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImg(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("jeera-box-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("jeera-box-images").getPublicUrl(path);
      setNewsImage(data.publicUrl);
      toast.success("تم رفع الصورة");
    } catch {
      toast.error("تعذّر رفع الصورة");
    } finally {
      setUploadingImg(false);
    }
  };

  const getAvatar = (p: NeighborWithItems) => {
    if (p.avatar_url) return <img src={p.avatar_url} alt={p.username} className="w-full h-full rounded-full object-cover" />;
    return <span className="text-xl">👤</span>;
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="pt-4 px-4">
        <h1 className="text-xl font-bold mb-3">جيراني 🏘️</h1>
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
          {(isAdmin ? (["neighbors", "box", "news", "admin"] as const) : (["neighbors", "box", "news"] as const)).map((t) => (
            <motion.button key={t} whileTap={tapScale} transition={spring.tap} onClick={() => setTab(t as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 gpu tap-fast ${tab === t ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted/50 text-muted-foreground"}`}>
              {t === "neighbors" ? <><Users size={12} /> الجيران</>
                : t === "box" ? <><Gift size={12} /> صندوق الحي</>
                : t === "news" ? <><Newspaper size={12} /> أخبار الحي</>
                : <><Crown size={12} /> الإدارة</>}
            </motion.button>
          ))}
        </div>

        {/* Search bar for neighbors tab */}
        {tab === "neighbors" && (
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو التخصص..."
              className="w-full h-10 pr-10 pl-4 rounded-2xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Add news button - admin only */}
        {tab === "news" && user && isAdmin && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddNews(!showAddNews)}
            className="w-full mb-3 h-10 rounded-2xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            انشر خبر جديد
          </motion.button>
        )}
        {tab === "news" && user && !isAdmin && (
          <div className="mb-3 p-3 rounded-2xl bg-muted/50 border border-border text-center">
            <Crown size={16} className="text-primary mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">نشر الأخبار متاح للمشرفين فقط. احصل على 5 تصويتات من جيرانك لتصبح مشرفاً.</p>
          </div>
        )}

        {/* Add news form */}
        <AnimatePresence>
          {showAddNews && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="bg-card rounded-2xl border border-border p-3 space-y-2">
                <input
                  type="text"
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  placeholder="عنوان الخبر"
                  maxLength={100}
                  className="w-full h-9 px-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <textarea
                  value={newsContent}
                  onChange={(e) => setNewsContent(e.target.value)}
                  placeholder="تفاصيل الخبر..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                {newsImage && (
                  <div className="relative">
                    <img src={newsImage} alt="" className="w-full h-32 object-cover rounded-xl" />
                    <button onClick={() => setNewsImage("")} className="absolute top-1 left-1 w-7 h-7 rounded-full bg-foreground/60 text-background flex items-center justify-center">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="h-9 px-3 rounded-xl bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                    {uploadingImg ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    صورة
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImg} />
                  </label>
                  <button
                    onClick={handlePostNews}
                    disabled={addNews.isPending || uploadingImg}
                    className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {addNews.isPending ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                    {isAdmin ? "نشر للحي (رسمي)" : "نشر"}
                  </button>
                  <button
                    onClick={() => { setShowAddNews(false); setNewsTitle(""); setNewsContent(""); setNewsImage(""); }}
                    className="h-9 px-4 rounded-xl bg-muted text-muted-foreground text-xs font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {tab === "neighbors" ? (
          neighborsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : filteredNeighbors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users size={40} className="mb-3 opacity-50" />
              <p className="text-sm">{searchQuery ? "لا توجد نتائج" : "لا يوجد جيران حالياً"}</p>
              {!searchQuery && <p className="text-xs mt-1">سجّل دخولك ليظهر جيرانك هنا</p>}
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
              {filteredNeighbors.map((n) => (
                <motion.div key={n.id} variants={staggerItem} transition={spring.listItem}
                  onClick={() => setSelectedNeighbor(n)}
                  className="bg-card rounded-3xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {getAvatar(n)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm truncate">{n.username}</span>
                      {n.is_verified && <Shield size={14} className="text-primary shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-0.5"><Star size={12} className="text-secondary" /><span className="text-xs text-muted-foreground">{n.trust_score}</span></div>
                      <span className="text-xs text-muted-foreground">• {n.itemCount} أغراض</span>
                    </div>
                    {n.bio && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.bio}</p>}
                  </div>
                  <MessageCircle size={18} className="text-muted-foreground" />
                </motion.div>
              ))}
            </motion.div>
          )
        ) : tab === "box" ? (
          <JeeraBoxSection />
        ) : tab === "admin" ? (
          <AdminPanel />
        ) : (
          newsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : news.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Newspaper size={40} className="mb-3 opacity-50" />
              <p className="text-sm">لا توجد أخبار حالياً</p>
              <p className="text-xs mt-1">كن أول من ينشر خبراً في حيّك!</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
              {[...news].sort((a: any, b: any) => Number(!!b.is_official) - Number(!!a.is_official)).map((n: any) => {
                const official = !!n.is_official;
                return (
                  <motion.div key={n.id} variants={staggerItem} transition={spring.listItem}
                    className={`rounded-3xl p-4 shadow-soft gpu ${official ? "glass-strong border-2 border-primary/40 shadow-soft-md" : "bg-card border border-border"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {official ? <Crown size={14} className="text-primary" /> : <Newspaper size={14} className="text-primary" />}
                        <span className="text-xs text-muted-foreground">{formatTime(n.created_at)}</span>
                      </div>
                      {official && (
                        <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-1">
                          <Crown size={10} /> رسمي
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm mb-1">{n.title}</h3>
                    <p className="text-muted-foreground text-xs whitespace-pre-wrap">{n.content}</p>
                    {n.image_url && (
                      <img src={n.image_url} alt="" className="mt-3 w-full max-h-60 object-cover rounded-2xl" />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )
        )}
      </div>

      <SlideOverPanel isOpen={!!selectedNeighbor} onClose={() => setSelectedNeighbor(null)} title={selectedNeighbor?.username || ""}>
        {selectedNeighbor && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
            <motion.div variants={staggerItem} transition={spring.staggerChild} className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl mb-3 overflow-hidden">
                {getAvatar(selectedNeighbor)}
              </div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold">{selectedNeighbor.username}</h2>
                {selectedNeighbor.is_verified && <Shield size={16} className="text-primary" />}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Star size={14} className="text-secondary" />
                <span className="text-sm text-muted-foreground">نقاط الثقة: {selectedNeighbor.trust_score}</span>
              </div>
            </motion.div>
            {selectedNeighbor.bio && (
              <motion.p variants={staggerItem} transition={spring.staggerChild} className="text-muted-foreground text-sm text-center">{selectedNeighbor.bio}</motion.p>
            )}
            <motion.div variants={staggerItem} transition={spring.staggerChild} className="bg-muted/50 rounded-3xl p-4 flex items-center justify-around">
              <div className="text-center">
                <p className="font-bold text-2xl text-primary">{selectedNeighbor.itemCount}</p>
                <p className="text-xs text-muted-foreground">أغراض</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-2xl text-primary">{selectedNeighbor.approvalCount || 0}/5</p>
                <p className="text-xs text-muted-foreground">تصويتات مشرف</p>
              </div>
            </motion.div>
            {!(selectedNeighbor as any).is_admin && (
              <motion.button variants={staggerItem} transition={spring.staggerChild} whileTap={{ scale: 0.97 }}
                onClick={() => approveNeighbor.mutate(selectedNeighbor.user_id)}
                disabled={approveNeighbor.isPending}
                className="w-full h-10 rounded-3xl font-bold text-xs flex items-center justify-center gap-2 border border-border text-muted-foreground">
                <ThumbsUp size={14} /> صوّت كمشرف حي ({selectedNeighbor.approvalCount || 0}/5)
              </motion.button>
            )}
            {(selectedNeighbor as any).is_admin && (
              <div className="flex items-center justify-center gap-1.5 text-primary text-xs font-bold">
                <Crown size={14} /> مشرف الحي
              </div>
            )}
            <motion.button variants={staggerItem} transition={spring.staggerChild} whileTap={{ scale: 0.97 }}
              onClick={() => { setHandshakeTarget(selectedNeighbor); setSelectedNeighbor(null); }}
              className="w-full h-12 rounded-3xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-primary text-primary">
              <Handshake size={18} /> مصافحة الثقة
            </motion.button>
            <motion.button variants={staggerItem} transition={spring.staggerChild} whileTap={{ scale: 0.97 }}
              onClick={() => handleStartChat(selectedNeighbor)}
              className="w-full h-12 bg-primary text-primary-foreground rounded-3xl font-bold text-sm">
              تواصل مع {selectedNeighbor.username}
            </motion.button>
          </motion.div>
        )}
      </SlideOverPanel>

      {handshakeTarget && user && (
        <HandshakeModal
          isOpen={!!handshakeTarget}
          onClose={() => setHandshakeTarget(null)}
          targetUserId={handshakeTarget.user_id}
          targetUsername={handshakeTarget.username}
        />
      )}

      {chatTarget && user && (
        <ChatModal
          isOpen={!!chatTarget}
          onClose={() => setChatTarget(null)}
          itemTitle={`محادثة مع ${chatTarget.username}`}
          sellerId={chatTarget.user_id}
        />
      )}
    </div>
  );
}