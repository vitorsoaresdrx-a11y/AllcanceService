import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  contact_photo: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: string;
  ai_enabled: boolean;
  human_takeover: boolean;
  instance_name: string | null;
  created_at: string;
  labels?: Array<{
    id: string;
    name: string;
    color: string;
    priority: number;
  }>;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  priority: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  message_id: string | null;
  from_me: boolean;
  type: string;
  content: string;
  media_url: string | null;
  status: string;
  created_at: string;
}

const CONVERSATIONS_KEY = ["whatsapp_conversations"];
const MESSAGES_KEY = ["whatsapp_messages"];

export function useConversations(statusFilter?: string, instanceName?: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("whatsapp_conversations_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        () => {
          qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: [...CONVERSATIONS_KEY, statusFilter, instanceName],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_conversations" as any)
        .select(`
          id, 
          contact_phone, 
          contact_name, 
          contact_photo, 
          last_message, 
          last_message_at, 
          unread_count, 
          status, 
          ai_enabled, 
          human_takeover, 
          instance_name, 
          created_at,
          whatsapp_conversation_labels!left (
            whatsapp_labels!left (
              id,
              name,
              color,
              priority
            )
          )
        `)
        .order("last_message_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (instanceName) {
        query = query.eq("instance_name", instanceName);
      }

      const { data, error } = await query as any;
      if (error) {
        if (error.code === "PGRST204" || error.message?.includes("whatsapp_conversation_labels")) {
           const { data: fallback, error: fallbackError } = await supabase
            .from("whatsapp_conversations" as any)
            .select("id, contact_phone, contact_name, contact_photo, last_message, last_message_at, unread_count, status, ai_enabled, human_takeover, instance_name, created_at")
            .order("last_message_at", { ascending: false });
           if (fallbackError) throw fallbackError;
           return (fallback as Conversation[]).filter(c => (c.contact_phone || "").replace(/\D/g, "").length >= 8);
        }
        throw error;
      };
      
      const normalizedData = (data as any[]).map(conv => ({
        ...conv,
        labels: conv.whatsapp_conversation_labels?.map((l: any) => l.whatsapp_labels).filter(Boolean) || []
      }));

      return (normalizedData as Conversation[]).filter((conversation) => {
        const normalizedPhone = (conversation.contact_phone || "").replace(/\D/g, "");
        return normalizedPhone.length >= 8;
      });
    },
  });
}

export function useMessages(conversationId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`whatsapp_messages_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: [...MESSAGES_KEY, conversationId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: [...MESSAGES_KEY, conversationId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);

  return useQuery({
    queryKey: [...MESSAGES_KEY, conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("id, conversation_id, message_id, from_me, type, content, media_url, status, created_at")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const reversed = (data as Message[]).reverse();
      return reversed.filter((msg) => {
        const isGhostStatusMessage =
          msg.type === "text" &&
          !msg.message_id &&
          !msg.media_url &&
          (!msg.content || msg.content === "[text]" || msg.content === "text");
        return !isGhostStatusMessage;
      });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      phone,
      message,
      conversationId,
      sendAsAudio,
      instanceName,
      media,
      mediatype,
      fileName,
      mimetype,
    }: {
      phone: string;
      message?: string;
      conversationId?: string;
      sendAsAudio?: boolean;
      instanceName?: string;
      media?: string;
      mediatype?: 'image' | 'video' | 'audio' | 'document';
      fileName?: string;
      mimetype?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "zapi-send-message",
        { body: { phone, message, conversationId, sendAsAudio, instanceName, media, mediatype, fileName, mimetype } }
      );
      if (error) throw error;
      return data;
    },
    onMutate: async (newMessage) => {
      if (!newMessage.conversationId || !newMessage.message) return;
      
      await qc.cancelQueries({ queryKey: [...MESSAGES_KEY, newMessage.conversationId] });
      await qc.cancelQueries({ queryKey: CONVERSATIONS_KEY });

      const previousMessages = qc.getQueryData([...MESSAGES_KEY, newMessage.conversationId]);
      
      qc.setQueryData([...MESSAGES_KEY, newMessage.conversationId], (old: any) => {
        const optimisticMsg = {
          id: `temp-${Date.now()}`,
          conversation_id: newMessage.conversationId,
          content: newMessage.message,
          from_me: true,
          type: 'text',
          status: 'sending',
          created_at: new Date().toISOString(),
        };
        return old ? [...old, optimisticMsg] : [optimisticMsg];
      });

      qc.setQueriesData({ queryKey: CONVERSATIONS_KEY }, (old: any) => {
        if (!old) return old;
        return old.map((conv: any) => {
          if (conv.id === newMessage.conversationId) {
            return {
              ...conv,
              last_message: newMessage.message,
              last_message_at: new Date().toISOString(),
            };
          }
          return conv;
        });
      });

      return { previousMessages };
    },
    onError: (err, newMessage, context: any) => {
      if (newMessage.conversationId && context?.previousMessages) {
        qc.setQueryData([...MESSAGES_KEY, newMessage.conversationId], context.previousMessages);
      }
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onSettled: (data, error, variables) => {
      if (variables.conversationId) {
        qc.invalidateQueries({ queryKey: [...MESSAGES_KEY, variables.conversationId] });
      }
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useUpdateConversationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useToggleAi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ai_enabled }: { id: string; ai_enabled: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ ai_enabled, human_takeover: !ai_enabled })
        .eq("id", id);
      if (error) throw error;

      if (!ai_enabled) {
        try {
          const { data: msgs } = await supabase
            .from("whatsapp_messages")
            .select("content, from_me, type")
            .eq("conversation_id", id)
            .order("created_at", { ascending: false })
            .limit(15);

          if (msgs && msgs.length > 0) {
            const conversation = msgs
              .reverse()
              .filter((m) => m.type === "text" && m.content && !m.content.startsWith("📋"))
              .map((m) => {
                const cleanContent = m.content.replace(/^🎤 /, "").replace(/^🔊 /, "");
                return `${m.from_me ? "IA" : "Cliente"}: ${cleanContent}`;
              })
              .join("\n");

            const { data: summaryData, error: summaryError } = await supabase.functions.invoke(
              "generate-handoff-summary",
              {
                body: {
                  conversationId: id,
                  conversation,
                },
              }
            );

            let finalSummary: string;

            if (summaryError || !summaryData?.summary) {
              finalSummary = `📋 *Resumo da conversa (IA → Humano):*\n\n${conversation}\n\n_IA desativada. Atendente humano assumiu._`;
            } else {
              finalSummary = `📋 *Resumo da conversa (IA → Humano):*\n\n${summaryData.summary}\n\n_IA desativada. Atendente humano assumiu._`;
            }

            // Remove resumos antigos (mantém limite de 6)
            const { data: existingSummaries } = await supabase
              .from("whatsapp_messages")
              .select("id")
              .eq("conversation_id", id)
              .eq("status", "internal")
              .order("created_at", { ascending: true });

            if (existingSummaries && existingSummaries.length >= 6) {
               const idsToDelete = existingSummaries.slice(0, (existingSummaries.length - 6) + 1).map(s => s.id);
               await supabase
                .from("whatsapp_messages")
                .delete()
                .in("id", idsToDelete);
            }

            await supabase.from("whatsapp_messages").insert({
              conversation_id: id,
              from_me: true,
              type: "text",
              content: finalSummary,
              status: "internal",
            });
          }
        } catch (e) {
          console.error("Failed to generate handoff summary:", e);
        }
      }
    },
    onMutate: async ({ id, ai_enabled }) => {
      await qc.cancelQueries({ queryKey: CONVERSATIONS_KEY });
      await qc.cancelQueries({ queryKey: [...MESSAGES_KEY, id] });

      const prevConvs = qc.getQueryData(CONVERSATIONS_KEY);
      const prevMessages = qc.getQueryData([...MESSAGES_KEY, id]);

      qc.setQueriesData({ queryKey: CONVERSATIONS_KEY }, (old: any) => {
        if (!old) return old;
        return old.map((conv: any) => {
          if (conv.id === id) {
            return { ...conv, ai_enabled, human_takeover: !ai_enabled };
          }
          return conv;
        });
      });

      if (!ai_enabled) {
        qc.setQueryData([...MESSAGES_KEY, id], (old: any) => {
          const loadingSummary = {
            id: `summary-loading-${Date.now()}`,
            conversation_id: id,
            from_me: true,
            type: "text",
            content: "📋 _Gerando resumo inteligente do atendimento..._",
            status: "internal",
            created_at: new Date().toISOString(),
            message_id: null,
            media_url: null,
          };
          return old ? [...old, loadingSummary] : [loadingSummary];
        });
      }

      return { prevConvs, prevMessages };
    },
    onError: (err, variables, context: any) => {
      if (context?.prevConvs) qc.setQueriesData({ queryKey: CONVERSATIONS_KEY }, context.prevConvs);
      if (context?.prevMessages) qc.setQueryData([...MESSAGES_KEY, variables.id], context.prevMessages);
    },
    onSettled: (data, error, variables) => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: [...MESSAGES_KEY, variables.id] });
    },
  });
}

export function useTotalUnread() {
  return useQuery({
    queryKey: [...CONVERSATIONS_KEY, "total_unread"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("unread_count, contact_phone");
      if (error) throw error;
      return (data || []).reduce((sum, c) => {
        const normalizedPhone = (c.contact_phone || "").replace(/\D/g, "");
        if (normalizedPhone.length < 8) return sum;
        return sum + (c.unread_count || 0);
      }, 0);
    },
  });
}

// ─── Labels Hooks ──────────────────────────────────────────────────────────

export function useLabels() {
  return useQuery({
    queryKey: ["whatsapp_labels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_labels")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return data as Label[];
    },
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (label: Omit<Label, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("whatsapp_labels")
        .insert(label)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp_labels"] });
    },
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_labels")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["whatsapp_labels"] });
      await qc.cancelQueries({ queryKey: CONVERSATIONS_KEY });
      const previousLabels = qc.getQueryData(["whatsapp_labels"]);
      
      qc.setQueryData(["whatsapp_labels"], (old: any) => old?.filter((l: any) => l.id !== id));
      
      qc.setQueriesData({ queryKey: CONVERSATIONS_KEY }, (old: any) => {
        if (!old) return old;
        return old.map((conv: any) => ({
          ...conv,
          labels: (conv.labels || []).filter((l: any) => l.id !== id)
        }));
      });
      
      return { previousLabels };
    },
    onError: (err, id, context: any) => {
      if (context?.previousLabels) qc.setQueryData(["whatsapp_labels"], context.previousLabels);
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp_labels"] });
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (label: Partial<Label> & { id: string }) => {
      const { data, error } = await supabase
        .from("whatsapp_labels")
        .update(label)
        .eq("id", label.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp_labels"] });
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useAssignLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, labelId }: { conversationId: string; labelId: string }) => {
      const { error } = await supabase
        .from("whatsapp_conversation_labels")
        .insert({ conversation_id: conversationId, label_id: labelId });
      if (error && error.code !== "23505") throw error; // 23505 is unique violation (already assigned)
    },
    onMutate: async ({ conversationId, labelId }) => {
      await qc.cancelQueries({ queryKey: CONVERSATIONS_KEY });
      const previousConvs = qc.getQueryData(CONVERSATIONS_KEY);
      const allLabels = qc.getQueryData(["whatsapp_labels"]) as any[];
      const labelToAssign = allLabels?.find(l => l.id === labelId);

      if (labelToAssign) {
        qc.setQueriesData({ queryKey: CONVERSATIONS_KEY }, (old: any) => {
          if (!old) return old;
          return old.map((conv: any) => {
            if (conv.id === conversationId) {
              const currentLabels = conv.labels || [];
              if (currentLabels.some((l: any) => l.id === labelId)) return conv;
              return { ...conv, labels: [...currentLabels, labelToAssign] };
            }
            return conv;
          });
        });
      }
      return { previousConvs };
    },
    onError: (err, variables, context: any) => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useUnassignLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, labelId }: { conversationId: string; labelId: string }) => {
      const { error } = await supabase
        .from("whatsapp_conversation_labels")
        .delete()
        .match({ conversation_id: conversationId, label_id: labelId });
      if (error) throw error;
    },
    onMutate: async ({ conversationId, labelId }) => {
      await qc.cancelQueries({ queryKey: CONVERSATIONS_KEY });
      const previousConvs = qc.getQueryData(CONVERSATIONS_KEY);
      
      qc.setQueriesData({ queryKey: CONVERSATIONS_KEY }, (old: any) => {
        if (!old) return old;
        return old.map((conv: any) => {
          if (conv.id === conversationId) {
            return { ...conv, labels: (conv.labels || []).filter((l: any) => l.id !== labelId) };
          }
          return conv;
        });
      });
      
      return { previousConvs };
    },
    onError: (err, variables, context: any) => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}
