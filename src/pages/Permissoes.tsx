import { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Trash2,
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
  Crown,
  UserPlus,
  Copy,
  Mail,
  Lock,
} from "lucide-react";
import {
  useTenantMembers,
  useMemberPermissions,
  useUpsertPermission,
  useRemoveMember,
  useMyPermissions,
  ALL_MODULES,
  type AppModule,
  type TenantMember,
} from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATION_LABELS: Record<string, string> = {
  admin: "Administração",
  salao: "Salão",
  mecanica: "Mecânica",
};

function getMemberDisplayName(member: TenantMember): string {
  const email = member.email || "";
  // station-admin-{uuid}@station.internal → "Administração"
  const stationMatch = email.match(/^station-(\w+)-/);
  if (stationMatch) {
    return STATION_LABELS[stationMatch[1]] || stationMatch[1];
  }
  return email || member.user_id.slice(0, 8) + "...";
}

function getMemberInitials(member: TenantMember): string {
  const name = getMemberDisplayName(member);
  return name.slice(0, 2).toUpperCase();
}

// ─── Permission Row ──────────────────────────────────────────────────────────

function PermissionRow({
  module,
  label,
  permission,
  memberId,
}: {
  module: AppModule;
  label: string;
  permission: { can_access: boolean; hide_sensitive: boolean } | undefined;
  memberId: string;
}) {
  const upsert = useUpsertPermission();
  const canAccess = permission?.can_access ?? false;
  const hideSensitive = permission?.hide_sensitive ?? false;

  const toggle = (field: "access" | "sensitive") => {
    const newAccess = field === "access" ? !canAccess : canAccess;
    const newHide = field === "sensitive" ? !hideSensitive : hideSensitive;

    upsert.mutate(
      { tenantMemberId: memberId, module, canAccess: newAccess, hideSensitive: newHide },
      { onError: () => toast.error("Erro ao salvar permissão") }
    );
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/[0.02] transition-colors">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => toggle("access")}
          disabled={upsert.isPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
            canAccess
              ? "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
              : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
          }`}
        >
          {canAccess ? <Check size={12} /> : <X size={12} />}
          {canAccess ? "Liberado" : "Bloqueado"}
        </button>

        {canAccess && (
          <button
            onClick={() => toggle("sensitive")}
            disabled={upsert.isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
              hideSensitive
                ? "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                : "bg-muted border-border/80 text-muted-foreground"
            }`}
          >
            {hideSensitive ? <EyeOff size={12} /> : <Eye size={12} />}
            {hideSensitive ? "Censurado" : "Visível"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Member Permissions Panel ────────────────────────────────────────────────

function MemberPermissionsPanel({ member }: { member: TenantMember }) {
  const { data: permissions = [], isLoading } = useMemberPermissions(member.id);
  const removeMember = useRemoveMember();

  const getPermission = (mod: AppModule) =>
    permissions.find((p) => p.module === mod);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
            {getMemberInitials(member)}
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {getMemberDisplayName(member)}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {member.role === "owner" ? "Proprietário" : "Membro"}
            </p>
          </div>
        </div>
        {member.role !== "owner" && (
          <button
            onClick={() =>
              removeMember.mutate(member.id, {
                onSuccess: () => toast.success("Membro removido"),
                onError: () => toast.error("Erro ao remover"),
              })
            }
            disabled={removeMember.isPending}
            className="p-2 text-muted-foreground/70 hover:text-zinc-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {member.role === "owner" ? (
        <div className="px-4 py-6 text-center">
          <Crown className="mx-auto text-zinc-400 mb-2" size={24} />
          <p className="text-xs text-muted-foreground">Proprietários possuem acesso total ao sistema.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {ALL_MODULES.map((mod) => (
            <PermissionRow
              key={mod.key}
              module={mod.key}
              label={mod.label}
              permission={getPermission(mod.key)}
              memberId={member.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Member Hook ──────────────────────────────────────────────────────

function useCreateMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("create-member", {
        body: { email, password },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar membro");
      }

      const result = response.data;
      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant", "members"] });
    },
  });
}

// ─── Add Member Dialog ───────────────────────────────────────────────────────

function AddMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const createMember = useCreateMember();

  const handleAdd = () => {
    if (!email.trim()) {
      toast.error("Insira o email");
      return;
    }
    if (!password.trim() || password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    createMember.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          toast.success("Membro criado com sucesso!");
          setEmail("");
          setPassword("");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message || "Erro ao criar membro"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-secondary border-border rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-white uppercase italic tracking-tight">
            Criar Novo Membro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cadastre um email e senha para o novo membro. Ele poderá usar essas credenciais para acessar o sistema.
          </p>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="membro@exemplo.com"
                className="w-full h-12 bg-card border border-border rounded-xl pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Senha
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full h-12 bg-card border border-border rounded-xl pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 rounded-xl border border-border text-muted-foreground hover:bg-muted text-sm font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={createMember.isPending}
              className="flex-[2] h-10 rounded-xl bg-primary text-white hover:bg-primary/80 text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {createMember.isPending ? <Loader2 size={14} className="animate-spin" /> : "Criar Membro"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Permissoes() {
  const { session } = useAuth();
  const { data: myPerms, isLoading: permsLoading } = useMyPermissions();
  const { data: members = [], isLoading: membersLoading } = useTenantMembers();
  const [selectedMember, setSelectedMember] = useState<TenantMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const isOwner = myPerms?.isOwner ?? false;

  useEffect(() => {
    if (members.length > 0 && !selectedMember) {
      const first = members.find((m) => m.role !== "owner") || members[0];
      setSelectedMember(first);
    }
  }, [members]);

  if (permsLoading || membersLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <Shield size={48} strokeWidth={1.5} />
        <p className="text-sm">Apenas o proprietário pode gerenciar permissões.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background text-foreground pb-24 lg:pb-0">
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-800 rounded-2xl flex items-center justify-center shadow-black/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-primary">
                CONTROLE
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight italic uppercase text-white">
              Permissões
            </h1>
            <p className="text-muted-foreground font-medium text-sm">
              Gerencie o acesso de cada membro do sistema
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddOpen(true)}
              className="h-10 px-5 rounded-xl bg-primary text-white hover:bg-primary/80 shadow-primary/30 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              <UserPlus size={14} /> Novo Membro
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Members list */}
          <div className="bg-card/50 rounded-3xl border border-border/30 p-4 space-y-2">
            <h3 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest px-2 mb-3">
              Membros ({members.length})
            </h3>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                  selectedMember?.id === m.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs shrink-0">
                  {m.role === "owner" ? (
                    <Crown size={14} className="text-zinc-400" />
                  ) : (
                    getMemberInitials(m)
                  )}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-foreground/80 truncate">
                    {getMemberDisplayName(m)}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                    {m.role === "owner" ? "Proprietário" : "Membro"}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Permission editor */}
          <div className="bg-card/50 rounded-3xl border border-border/30 p-6">
            {selectedMember ? (
              <MemberPermissionsPanel member={selectedMember} />
            ) : (
              <div className="flex items-center justify-center py-20 text-muted-foreground/70 text-sm">
                Selecione um membro para editar permissões
              </div>
            )}
          </div>
        </div>
      </div>

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
