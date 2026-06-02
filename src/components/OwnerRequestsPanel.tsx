import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Inbox, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PendingRequest {
  id: string;
  item_id: string;
  requester_id: string;
  status: string;
  created_at: string;
  items: { title: string; status: string } | null;
  profiles?: { username: string } | null;
}

export function OwnerRequestsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["owner-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Fetch pending requests for items the current user owns
      const { data: myItems } = await supabase.from("items").select("id").eq("owner_id", user!.id);
      const ids = (myItems || []).map((i) => i.id);
      if (ids.length === 0) return [] as PendingRequest[];
      const { data, error } = await supabase
        .from("requests")
        .select("id, item_id, requester_id, status, created_at, items(title, status)")
        .in("item_id", ids)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Enrich with requester username
      const reqIds = Array.from(new Set((data || []).map((r) => r.requester_id)));
      const namesMap: Record<string, string> = {};
      if (reqIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", reqIds);
        (profs || []).forEach((p) => (namesMap[p.user_id] = p.username));
      }
      return (data as any[]).map((r) => ({ ...r, profiles: { username: namesMap[r.requester_id] || "جار" } })) as PendingRequest[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`owner-requests-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" },
        () => qc.invalidateQueries({ queryKey: ["owner-requests", user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { data, error } = await supabase.rpc("decide_item_request", { p_request_id: id, p_approve: approve });
      if (error) throw error;
      const r = data as any;
      if (!r?.success) throw new Error(r?.error || "تعذّر تنفيذ الطلب");
      return r;
    },
    onSuccess: (_r, vars) => {
      toast.success(vars.approve ? "تم القبول ✅" : "تم الرفض");
      qc.invalidateQueries({ queryKey: ["owner-requests", user?.id] });
      qc.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) return null;
  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl border border-border p-4 mb-4 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-primary" />
      </div>
    );
  }
  if (requests.length === 0) return null;

  return (
    <div className="bg-card rounded-3xl border border-border p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Inbox size={16} className="text-primary" />
        <p className="font-bold text-sm">طلبات على أغراضك ({requests.length})</p>
      </div>
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="bg-muted/40 rounded-2xl p-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{r.items?.title || "غرض"}</p>
              <p className="text-[10px] text-muted-foreground">من: {r.profiles?.username}</p>
            </div>
            <button
              onClick={() => decide.mutate({ id: r.id, approve: true })}
              disabled={decide.isPending}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              aria-label="قبول"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => decide.mutate({ id: r.id, approve: false })}
              disabled={decide.isPending}
              className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center disabled:opacity-50"
              aria-label="رفض"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
