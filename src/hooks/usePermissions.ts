import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppModule =
  | "dashboard"
  | "dre"
  | "metas"
  | "produtos"
  | "bikes"
  | "estoque"
  | "pdv"
  | "caixa"
  | "historico"
  | "mecanica"
  | "mecanicos"
  | "mecanicos_historico"
  | "orcamentos"
  | "gastos"
  | "contas"
  | "clientes"
  | "whatsapp"
  | "configuracoes"
  | "chamadas"
  | "permissoes"
  | "ponto"
  | "agenda"
  | "pagamentos";

export const ALL_MODULES: { key: AppModule; label: string }[] = [
  { key: "dashboard", label: "Ações Rápidas" },
  { key: "dre", label: "Dashboard / DRE" },
  { key: "metas", label: "Metas" },
  { key: "produtos", label: "Produtos" },
  { key: "bikes", label: "Bikes" },
  { key: "estoque", label: "Estoque" },
  { key: "pdv", label: "PDV" },
  { key: "caixa", label: "Caixa" },
  { key: "historico", label: "Histórico" },
  { key: "mecanica", label: "Mecânica" },
  { key: "mecanicos", label: "Mecânicos" },
  { key: "mecanicos_historico", label: "Histórico Mecânicos" },
  { key: "orcamentos", label: "Orçamentos" },
  { key: "gastos", label: "Gastos" },
  { key: "contas", label: "Contas" },
  { key: "clientes", label: "Clientes" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "ponto", label: "Ponto" },
  { key: "chamadas", label: "Chamadas" },
  { key: "permissoes", label: "Permissões" },
  { key: "configuracoes", label: "Configurações" },
  { key: "agenda", label: "Agenda" },
  { key: "pagamentos", label: "Pagamentos Loja" },
];

export const ROUTE_MODULE_MAP: Record<string, AppModule> = {
  "/": "dashboard",
  "/dre": "dre",
  "/metas": "metas",
  "/produtos": "produtos",
  "/bikes": "bikes",
  "/bikes/nova": "bikes",
  "/estoque": "estoque",
  "/pdv": "pdv",
  "/caixa": "caixa",
  "/historico": "historico",
  "/mecanica": "mecanica",
  "/mecanicos": "mecanicos",
  "/mecanicos/historico": "mecanicos_historico",
  "/orcamentos": "orcamentos",
  "/gastos": "gastos",
  "/contas": "contas",
  "/clientes": "clientes",
  "/whatsapp": "whatsapp",
  "/configuracoes": "configuracoes",
  "/chamadas": "chamadas",
  "/permissoes": "permissoes",
  "/ponto/registro": "ponto",
  "/ponto/relatorio": "ponto",
  "/ponto/cadastro": "ponto",
  "/agenda": "agenda",
  "/pagamentos": "pagamentos",
};

export const NAV_MODULE_MAP: Record<string, AppModule> = {
  "/": "dashboard",
  "/dre": "dre",
  "/metas": "metas",
  "/produtos": "produtos",
  "/bikes": "bikes",
  "/estoque": "estoque",
  "/precos": "estoque",
  "/pdv": "pdv",
  "/promocoes": "pdv",
  "/caixa": "caixa",
  "/historico": "historico",
  "/mecanica": "mecanica",
  "/mecanicos": "mecanicos",
  "/mecanicos/historico": "mecanicos_historico",
  "/orcamentos": "orcamentos",
  "/gastos": "gastos",
  "/contas": "contas",
  "/clientes": "clientes",
  "/whatsapp": "whatsapp",
  "/ponto/registro": "ponto",
  "/ponto/relatorio": "ponto",
  "/ponto/cadastro": "ponto",
  "/chamadas": "chamadas",
  "/permissoes": "permissoes",
  "/configuracoes": "configuracoes",
  "/agenda": "agenda",
  "/loja": "dashboard",
  "/developer": "configuracoes",
  "/simulador-frete": "configuracoes",
  "/pagamentos": "pagamentos",
};

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
  email?: string;
}

export interface ModulePermission {
  id: string;
  tenant_member_id: string;
  module: AppModule;
  can_access: boolean;
  hide_sensitive: boolean;
}

const PERMISSIONS_KEY = ["permissions"];
const TENANT_KEY = ["tenant"];

export function useMyPermissions() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: [...PERMISSIONS_KEY, "my", userId],
    queryFn: async () => {
      const { data: member } = await supabase
        .from("tenant_members")
        .select("*")
        .eq("user_id", userId!)
        .single();

      if (!member) return { isOwner: false, permissions: [] as ModulePermission[], memberId: null };

      const isOwner = member.role === "owner";
      if (isOwner) return { isOwner: true, permissions: [] as ModulePermission[], memberId: member.id };

      const { data: permissions } = await supabase
        .from("module_permissions")
        .select("*")
        .eq("tenant_member_id", member.id);

      return {
        isOwner: false,
        permissions: (permissions || []) as unknown as ModulePermission[],
        memberId: member.id,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useCanAccess(module: AppModule): { canAccess: boolean; hideSensitive: boolean; loading: boolean } {
  const { data, isLoading } = useMyPermissions();

  if (isLoading || !data) return { canAccess: true, hideSensitive: false, loading: false };
  if (data.isOwner) return { canAccess: true, hideSensitive: false, loading: false };

  const perm = data.permissions.find((p) => p.module === module);
  // If no permission row exists, default to allowing access (fail-open)
  // This prevents modules from disappearing when permissions haven't been configured yet
  if (!perm) return { canAccess: true, hideSensitive: false, loading: false };

  return { canAccess: perm.can_access, hideSensitive: perm.hide_sensitive, loading: false };
}

export function useTenantMembers() {
  const { session } = useAuth();

  return useQuery({
    queryKey: [...TENANT_KEY, "members"],
    queryFn: async () => {
      const { data: members } = await supabase
        .from("tenant_members")
        .select("*")
        .order("created_at");

      return (members || []) as unknown as TenantMember[];
    },
    enabled: !!session?.user?.id,
  });
}

export function useMemberPermissions(memberId: string | null) {
  return useQuery({
    queryKey: [...PERMISSIONS_KEY, "member", memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("module_permissions")
        .select("*")
        .eq("tenant_member_id", memberId!);

      return (data || []) as unknown as ModulePermission[];
    },
    enabled: !!memberId,
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { data: myMember } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", session!.user.id)
        .single();

      if (!myMember) throw new Error("Tenant não encontrado");

      throw new Error("Use o ID do usuário ou peça para o membro criar conta primeiro");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...TENANT_KEY, "members"] }),
  });
}

export function useAddMemberById() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data: myMember } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", session!.user.id)
        .single();

      if (!myMember) throw new Error("Tenant não encontrado");

      const { error } = await supabase.from("tenant_members").insert({
        tenant_id: myMember.tenant_id,
        user_id: userId,
        role: "member",
      });

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...TENANT_KEY, "members"] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("tenant_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...TENANT_KEY, "members"] }),
  });
}

export function useUpsertPermission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantMemberId,
      module,
      canAccess,
      hideSensitive,
    }: {
      tenantMemberId: string;
      module: AppModule;
      canAccess: boolean;
      hideSensitive: boolean;
    }) => {
      const { error } = await supabase
        .from("module_permissions")
        .upsert(
          {
            tenant_member_id: tenantMemberId,
            module: module as any,
            can_access: canAccess,
            hide_sensitive: hideSensitive,
          } as any,
          { onConflict: "tenant_member_id,module" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISSIONS_KEY });
    },
  });
}

export function usePermissions() {
  const { session } = useAuth();
  const user = session?.user;
  const role = user?.user_metadata?.role ?? user?.role ?? "";
  
  return {
    isSalao: role === "salao",
    isAdmin: role === "administrador" || role === "admin",
    isOficina: role === "oficina",
    isMecanica: role === "mecanica",
    canSeeAlerts: role === "salao" || role === "administrador" || role === "admin",
  };
}
