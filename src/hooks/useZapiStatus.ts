import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const STATUS_KEY = ["zapi_status"];
const INSTANCE_STORAGE_KEY = "selected_whatsapp_instance";

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${data.session?.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

function zapiUrl(action: string, params?: Record<string, string>) {
  const base = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/zapi-status?action=${action}`;
  if (!params) return base;
  const extra = new URLSearchParams(params).toString();
  return `${base}&${extra}`;
}

export interface EvolutionInstance {
  instanceName: string;
  state: string;
  connected: boolean;
}

/** Fetch all Evolution instances */
export function useEvolutionInstances() {
  return useQuery({
    queryKey: [...STATUS_KEY, "instances"],
    queryFn: async () => {
      const res = await fetch(zapiUrl("list-instances"), { headers: await getAuthHeaders() });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Fetch instances failed: ${text}`);
      }
      const data = await res.json();
      return (data.instances || []) as EvolutionInstance[];
    },
    staleTime: 1000 * 30,
    refetchInterval: 30000,
    retry: 1,
  });
}

/** Manage selected instance with localStorage persistence */
export function useSelectedInstance() {
  const [selected, setSelected] = useState<string | null>(() => {
    try {
      return localStorage.getItem(INSTANCE_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (selected) {
        localStorage.setItem(INSTANCE_STORAGE_KEY, selected);
      } else {
        localStorage.removeItem(INSTANCE_STORAGE_KEY);
      }
    } catch {}
  }, [selected]);

  return { selected, setSelected };
}

/** Check connection status of a specific instance */
export function useInstanceStatus(instanceName: string | null) {
  return useQuery({
    queryKey: [...STATUS_KEY, "instance-status", instanceName],
    enabled: !!instanceName,
    queryFn: async () => {
      const res = await fetch(
        zapiUrl("status", { instance: instanceName! }),
        { headers: await getAuthHeaders() }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Status check failed: ${text}`);
      }
      return res.json() as Promise<{ connected: boolean; state: string; instanceName: string }>;
    },
    staleTime: 1000 * 15,
    refetchInterval: 15000,
    retry: 1,
  });
}
