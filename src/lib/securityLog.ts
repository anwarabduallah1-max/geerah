import { supabase } from "@/integrations/supabase/client";

type LogParams = {
  event_type: string;
  resource: string;
  status_code?: number;
  details?: Record<string, unknown>;
};

/**
 * Fire-and-forget logger for failed/suspicious access attempts.
 * Stored in public.security_events; only the user themselves and admins can read.
 */
export async function logSecurityEvent({ event_type, resource, status_code, details }: LogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("security_events" as any).insert({
      user_id: user?.id ?? null,
      event_type,
      resource,
      status_code: status_code ?? null,
      details: details ?? {},
    });
  } catch {
    // Never throw from a logger
  }
}
