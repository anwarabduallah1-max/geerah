import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useItems = () => {
  return useQuery({
    queryKey: ["items"],
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      // Fetch items with owner profile so cards can render owner name correctly
      const { data: itemsData, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ownerIds = Array.from(new Set((itemsData ?? []).map((i) => i.owner_id)));
      let ownersMap: Record<string, { username: string; avatar_url: string | null }> = {};
      if (ownerIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", ownerIds);
        (profiles ?? []).forEach((p) => {
          ownersMap[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
        });
      }
      return (itemsData ?? []).map((i) => ({
        ...i,
        owner: ownersMap[i.owner_id] ?? { username: "جار", avatar_url: null },
      }));
    },
  });
};

export const useRequestItem = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      const { error } = await supabase.from("requests").insert({
        item_id: itemId,
        requester_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إرسال الطلب بنجاح! ✅");
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء إرسال الطلب");
    },
  });
};
