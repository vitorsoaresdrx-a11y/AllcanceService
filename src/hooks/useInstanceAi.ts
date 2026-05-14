import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const INSTANCE_AI_KEY = ["whatsapp_instance_ai"];

export function useInstanceAi(instanceName: string | null) {
  return useQuery({
    queryKey: [...INSTANCE_AI_KEY, instanceName],
    enabled: !!instanceName,
    queryFn: async () => {
      if (!instanceName) return null;

      const { data, error } = await supabase
        .from("whatsapp_instance_settings")
        .select("ai_enabled")
        .eq("instance_name", instanceName)
        .single();

      if (error) {
        // Se não existe registro, a IA está ativa por padrão
        if (error.code === "PGRST116") {
          return { ai_enabled: true };
        }
        throw error;
      }

      return data;
    },
  });
}

export function useToggleInstanceAi() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      instanceName,
      ai_enabled,
    }: {
      instanceName: string;
      ai_enabled: boolean;
    }) => {
      // Tenta atualizar primeiro
      const { data: existing } = await supabase
        .from("whatsapp_instance_settings")
        .select("instance_name")
        .eq("instance_name", instanceName)
        .single();

      if (existing) {
        // Atualiza se já existe
        const { error } = await supabase
          .from("whatsapp_instance_settings")
          .update({ ai_enabled, updated_at: new Date().toISOString() })
          .eq("instance_name", instanceName);

        if (error) throw error;
      } else {
        // Cria se não existe
        const { error } = await supabase
          .from("whatsapp_instance_settings")
          .insert({ instance_name: instanceName, ai_enabled });

        if (error) throw error;
      }
    },
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: [...INSTANCE_AI_KEY, variables.instanceName] });
      const previousState = qc.getQueryData([...INSTANCE_AI_KEY, variables.instanceName]);
      qc.setQueryData([...INSTANCE_AI_KEY, variables.instanceName], { ai_enabled: variables.ai_enabled });
      return { previousState };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousState) {
        qc.setQueryData([...INSTANCE_AI_KEY, variables.instanceName], context.previousState);
      }
    },
    onSettled: (_, __, variables) => {
      qc.invalidateQueries({ queryKey: [...INSTANCE_AI_KEY, variables.instanceName] });
    },
  });
}
