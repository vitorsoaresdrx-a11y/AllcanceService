import React, { useMemo, useState } from "react";
import {
  CreditCard,
  Save,
  HardHat,
  Plus,
  Power,
  Lock,
  Users,
  X,
  ChevronRight,
  Settings2,
  ShieldCheck,
  Cpu,
  ArrowLeft,
  Trash2,
  Bot,
  Bell,
} from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  useCardTaxes,
  useUpdateCardTaxes,
  useStationPasswords,
  useUpdateStationPasswords,
  useSalaoNames,
  useUpdateSalaoNames,
  useAiInstructions,
  useUpdateAiInstructions,
  useWhatsAppNumber,
  useUpdateWhatsAppNumber,
  type StationPasswords,
} from "@/hooks/useSettings";
import { useMechanics, useCreateMechanic, useToggleMechanic, useDeleteMechanic } from "@/hooks/useMechanics";
import { useMyPermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

// --- Componentes de UI Premium ---

const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}) => {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary/80 shadow-primary/20",
    secondary: "bg-[#1C1C1E] text-zinc-100 hover:bg-[#2C2C2E] border border-zinc-800",
    ghost: "hover:bg-white/5 text-zinc-400 hover:text-white",
    destructive: "bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 border border-zinc-500/20",
  };
  const sizes = {
    sm: "h-9 px-4 text-[10px] font-black uppercase tracking-widest",
    md: "h-12 px-6 text-sm font-bold",
    lg: "h-14 px-8 rounded-2xl text-base font-black italic uppercase",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-2xl transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const ConfigSection = ({
  title,
  description,
  icon: Icon,
  active,
  onClick,
  children,
  summary,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  summary?: React.ReactNode;
}) => (
  <div className={`transition-all duration-500 ${active ? "mb-8" : "mb-4"}`}>
    {!active ? (
      <button
        onClick={onClick}
        className="w-full text-left p-8 bg-[#161618] border border-zinc-800 rounded-[32px] hover:border-primary/50 group transition-all relative overflow-hidden"
      >
        <div className="absolute -right-4 -top-4 opacity-[0.02] text-white group-hover:scale-110 transition-transform">
          <Icon size={120} />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-primary group-hover:border-primary/30 transition-all">
              <Icon size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase italic">{title}</h3>
              <p className="text-xs text-zinc-500 font-medium">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {summary && <div className="hidden md:block text-right">{summary}</div>}
            <ChevronRight className="text-zinc-800 group-hover:text-white transition-colors" />
          </div>
        </div>
      </button>
    ) : (
      <div className="bg-[#161618] border border-primary/30 rounded-[40px] p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-10 pb-8 border-b border-zinc-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">{title}</h3>
              <p className="text-sm text-zinc-500">{description}</p>
            </div>
          </div>
          <button
            onClick={onClick}
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white transition-colors border border-zinc-800"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        {children}
      </div>
    )}
  </div>
);

const StationInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between gap-4 group focus-within:border-primary/50 transition-all">
    <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">{label}</span>
    <div className="flex items-center gap-4 flex-1 md:max-w-xs">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="premium-input h-12 text-center tracking-[0.3em] font-black"
        placeholder="••••••"
      />
    </div>
  </div>
);

// --- Componente Principal ---

export default function Configuracoes() {
  const { toast } = useToast();
  const { data: taxes, isLoading } = useCardTaxes();
  const updateTaxes = useUpdateCardTaxes();
  const { data: permsData } = useMyPermissions();
  const isOwner = permsData?.isOwner ?? false;

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const toggle = (tab: string) => setActiveTab((prev) => (prev === tab ? null : tab));

  // Card taxes
  const [creditTax, setCreditTax] = useState<number | null>(null);
  const [debitTax, setDebitTax] = useState<number | null>(null);
  const effectiveCredit = creditTax ?? taxes?.credit_tax ?? 0;
  const effectiveDebit = debitTax ?? taxes?.debit_tax ?? 0;

  // Mechanics
  const [newMechanicName, setNewMechanicName] = useState("");
  const [deleteMechanicId, setDeleteMechanicId] = useState<string | null>(null);
  const { data: mechanics = [] } = useMechanics();
  const createMechanic = useCreateMechanic();
  const toggleMechanic = useToggleMechanic();
  const deleteMechanic = useDeleteMechanic();
  const mechanicToDelete = useMemo(
    () => mechanics.find((m) => m.id === deleteMechanicId) ?? null,
    [mechanics, deleteMechanicId]
  );

  // Station passwords
  const { data: stationPasswords } = useStationPasswords();
  const updateStationPasswords = useUpdateStationPasswords();
  const [stationPwds, setStationPwds] = useState<StationPasswords | null>(null);
  const effectiveStationPwds: StationPasswords = stationPwds ?? stationPasswords ?? {
    admin: "",
    salao: "",
    mecanica: "",
  };

  // Salão names
  const { data: salaoNames = [] } = useSalaoNames();
  const updateSalaoNames = useUpdateSalaoNames();
  const [newSalaoName, setNewSalaoName] = useState("");

  // AI Instructions
  const { data: aiInstructions = "" } = useAiInstructions();
  const updateAiInstructions = useUpdateAiInstructions();
  const [aiInstructionsText, setAiInstructionsText] = useState<string | null>(null);
  const effectiveAiInstructions = aiInstructionsText ?? aiInstructions;

  // WhatsApp Agenda
  const { data: whatsappNumber = "" } = useWhatsAppNumber();
  const updateWhatsApp = useUpdateWhatsAppNumber();
  const [whatsappText, setWhatsappText] = useState<string | null>(null);
  const effectiveWhatsApp = whatsappText ?? whatsappNumber;

  // --- Handlers ---

  const handleSaveTaxes = async () => {
    try {
      await updateTaxes.mutateAsync({ credit_tax: effectiveCredit, debit_tax: effectiveDebit });
      toast({ title: "Taxas atualizadas com sucesso" });
      setCreditTax(null);
      setDebitTax(null);
    } catch {
      toast({ title: "Erro ao salvar taxas", variant: "destructive" });
    }
  };

  const handleAddMechanic = async () => {
    if (!newMechanicName.trim()) return;
    try {
      await createMechanic.mutateAsync(newMechanicName.trim());
      toast({ title: "Mecânico adicionado" });
      setNewMechanicName("");
    } catch {
      toast({ title: "Erro ao adicionar mecânico", variant: "destructive" });
    }
  };

  const handleDeleteMechanic = async () => {
    if (!deleteMechanicId) return;
    const id = deleteMechanicId;
    setDeleteMechanicId(null);
    try {
      await deleteMechanic.mutateAsync(id);
      toast({ title: "Mecânico excluído" });
    } catch (e: any) {
      const msg =
        typeof e?.message === "string" && e.message
          ? e.message
          : "Se este mecânico já foi usado em ordens/serviços, desative ao invés de excluir.";
      toast({ title: "Erro ao excluir mecânico", description: msg, variant: "destructive" });
    }
  };

  const handleSaveStationPasswords = async () => {
    try {
      await updateStationPasswords.mutateAsync(effectiveStationPwds);
      toast({ title: "Senhas das estações salvas" });
      setStationPwds(null);
    } catch {
      toast({ title: "Erro ao salvar senhas", variant: "destructive" });
    }
  };

  const handleAddSalaoName = async () => {
    const name = newSalaoName.trim();
    if (!name) return;
    if (salaoNames.includes(name)) {
      toast({ title: "Nome já cadastrado", variant: "destructive" });
      return;
    }
    try {
      await updateSalaoNames.mutateAsync([...salaoNames, name]);
      toast({ title: "Nome adicionado" });
      setNewSalaoName("");
    } catch {
      toast({ title: "Erro ao adicionar nome", variant: "destructive" });
    }
  };

  const handleRemoveSalaoName = async (name: string) => {
    try {
      await updateSalaoNames.mutateAsync(salaoNames.filter((n) => n !== name));
      toast({ title: "Nome removido" });
    } catch {
      toast({ title: "Erro ao remover nome", variant: "destructive" });
    }
  };

  const handleSaveAiInstructions = async () => {
    try {
      await updateAiInstructions.mutateAsync(effectiveAiInstructions);
      toast({ title: "Instruções da IA salvas" });
      setAiInstructionsText(null);
    } catch {
      toast({ title: "Erro ao salvar instruções", variant: "destructive" });
    }
  };

  const handleSaveWhatsApp = async () => {
    try {
      await updateWhatsApp.mutateAsync(effectiveWhatsApp);
      toast({ title: "Número de WhatsApp atualizado" });
      setWhatsappText(null);
    } catch {
      toast({ title: "Erro ao salvar número", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-primary/30 pb-24">
      <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">

        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30">
              <Settings2 size={20} className="text-white" />
            </div>
            <span className="text-[10px] font-black tracking-[0.4em] text-primary uppercase">
              System Preferences
            </span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
            Configurações
          </h1>
        </header>

        <div className="space-y-4">

          {/* 1. Taxas de Cartão */}
          <ConfigSection
            title="Central de Pagamentos"
            description="Ajuste as taxas operacionais das máquinas de cartão."
            icon={CreditCard}
            active={activeTab === "card"}
            onClick={() => toggle("card")}
            summary={
              !isLoading && taxes ? (
                <div className="flex gap-4">
                  <span className="text-[9px] font-bold text-zinc-600 uppercase">
                    Crédito <b className="text-zinc-300 ml-1">{taxes.credit_tax}%</b>
                  </span>
                  <span className="text-[9px] font-bold text-zinc-600 uppercase">
                    Débito <b className="text-zinc-300 ml-1">{taxes.debit_tax}%</b>
                  </span>
                </div>
              ) : null
            }
          >
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-primary">
                    Taxa de Crédito (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      className="premium-input h-16 text-2xl font-black"
                      value={effectiveCredit}
                      onChange={(e) => setCreditTax(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-700 font-black">%</span>
                  </div>
                </div>
                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-primary">
                    Taxa de Débito (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      className="premium-input h-16 text-2xl font-black"
                      value={effectiveDebit}
                      onChange={(e) => setDebitTax(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-700 font-black">%</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800 flex items-center gap-4">
                <ShieldCheck size={20} className="text-primary" />
                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                  Taxas aplicadas automaticamente no cálculo do Lucro Líquido do PDV e do DRE Financeiro.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleSaveTaxes}
                disabled={updateTaxes.isPending}
              >
                <Save size={16} />
                Salvar Novas Taxas
              </Button>
            </div>
          </ConfigSection>

          {/* 2. Mecânicos — Owner only */}
          {isOwner && (
            <>
              <ConfigSection
                title="Mecânicos"
                description="Cadastre e gerencie os mecânicos da oficina."
                icon={HardHat}
                active={activeTab === "mechanics"}
                onClick={() => toggle("mechanics")}
                summary={
                  <span className="text-[9px] font-bold text-zinc-600 uppercase">
                    {mechanics.filter((m) => m.active).length} ativo(s) de {mechanics.length}
                  </span>
                }
              >
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <input
                      placeholder="Nome do novo mecânico..."
                      className="premium-input h-14 flex-1"
                      value={newMechanicName}
                      onChange={(e) => setNewMechanicName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMechanic()}
                    />
                    <Button
                      className="rounded-2xl px-8"
                      onClick={handleAddMechanic}
                      disabled={createMechanic.isPending}
                    >
                      <Plus size={20} />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {mechanics.map((m) => (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-5 bg-zinc-900/30 border rounded-[24px] transition-all ${
                          m.active ? "border-zinc-800 hover:border-zinc-700" : "border-zinc-800/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              m.active
                                ? "bg-primary shadow-primary/50"
                                : "bg-zinc-800"
                            }`}
                          />
                          <span
                            className={`font-bold ${
                              m.active ? "text-zinc-100" : "text-zinc-600 line-through"
                            }`}
                          >
                            {m.name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => toggleMechanic.mutate({ id: m.id, active: !m.active })}
                            disabled={toggleMechanic.isPending || deleteMechanic.isPending}
                          >
                            <Power size={14} />
                            {m.active ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setDeleteMechanicId(m.id)}
                            disabled={toggleMechanic.isPending || deleteMechanic.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {mechanics.length === 0 && (
                      <p className="text-xs text-zinc-600 text-center py-6">
                        Nenhum mecânico cadastrado
                      </p>
                    )}
                  </div>
                </div>
              </ConfigSection>

              <ConfirmDeleteDialog
                open={!!deleteMechanicId}
                onOpenChange={(open) => !open && setDeleteMechanicId(null)}
                onConfirm={handleDeleteMechanic}
                title="Excluir mecânico"
                description={
                  mechanicToDelete
                    ? `Tem certeza que deseja excluir "${mechanicToDelete.name}"? Esta ação não pode ser desfeita.`
                    : "Tem certeza que deseja excluir este mecânico? Esta ação não pode ser desfeita."
                }
              />

              {/* 3. Senhas das Estações */}
              <ConfigSection
                title="Senhas de Acesso"
                description="Defina a senha de cada estação: admin, salão e mecânica."
                icon={Lock}
                active={activeTab === "security"}
                onClick={() => toggle("security")}
                summary={
                  stationPasswords &&
                  (stationPasswords.admin || stationPasswords.salao || stationPasswords.mecanica) ? (
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">Configuradas</span>
                  ) : null
                }
              >
                <div className="space-y-6">
                  <StationInput
                    label="Acesso Administrativo"
                    value={effectiveStationPwds.admin}
                    onChange={(v) => setStationPwds({ ...effectiveStationPwds, admin: v })}
                  />
                  <StationInput
                    label="Acesso Salão / Vendas"
                    value={effectiveStationPwds.salao}
                    onChange={(v) => setStationPwds({ ...effectiveStationPwds, salao: v })}
                  />
                  <StationInput
                    label="Acesso Oficina / Mecânica"
                    value={effectiveStationPwds.mecanica}
                    onChange={(v) => setStationPwds({ ...effectiveStationPwds, mecanica: v })}
                  />
                  <Button
                    className="w-full mt-4"
                    onClick={handleSaveStationPasswords}
                    disabled={updateStationPasswords.isPending}
                  >
                    <Save size={16} />
                    Atualizar Senhas
                  </Button>
                </div>
              </ConfigSection>

              {/* 4. Nomes do Salão */}
              <ConfigSection
                title="Operadores do Salão"
                description="Nomes que aparecem na tela de login do salão."
                icon={Users}
                active={activeTab === "salao"}
                onClick={() => toggle("salao")}
                summary={
                  salaoNames.length > 0 ? (
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">
                      {salaoNames.length} cadastrado(s)
                    </span>
                  ) : null
                }
              >
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <input
                      placeholder="Nome do operador..."
                      className="premium-input h-14 flex-1"
                      value={newSalaoName}
                      onChange={(e) => setNewSalaoName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSalaoName()}
                    />
                    <Button
                      className="rounded-2xl px-8"
                      onClick={handleAddSalaoName}
                      disabled={updateSalaoNames.isPending}
                    >
                      <Plus size={20} />
                      Adicionar
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {salaoNames.map((name) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 px-6 py-3 bg-primary/10 border border-primary/20 rounded-2xl group"
                      >
                        <span className="text-sm font-black text-primary uppercase tracking-widest">
                          {name}
                        </span>
                        <button
                          className="text-zinc-600 hover:text-zinc-500 transition-colors"
                          onClick={() => handleRemoveSalaoName(name)}
                          disabled={updateSalaoNames.isPending}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {salaoNames.length === 0 && (
                      <p className="text-xs text-zinc-600 py-4">Nenhum nome cadastrado</p>
                    )}
                  </div>
                </div>
              </ConfigSection>
              {/* 5. Instruções pra IA */}
              <ConfigSection
                title="Instruções pra IA"
                description="Regras personalizadas que a IA sempre considera antes de responder no WhatsApp."
                icon={Bot}
                active={activeTab === "ai_instructions"}
                onClick={() => toggle("ai_instructions")}
                summary={
                  aiInstructions ? (
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">Configuradas</span>
                  ) : null
                }
              >
                <div className="space-y-6">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Escreva aqui as regras que a IA deve sempre seguir ao atender clientes pelo WhatsApp. Por exemplo: tom de voz, saudações obrigatórias, restrições de assunto, etc.
                  </p>
                  <textarea
                    className="w-full h-48 bg-[#0A0A0B] border border-zinc-800 rounded-[20px] p-5 text-zinc-100 text-sm resize-none outline-none focus:border-primary transition-all font-medium leading-relaxed placeholder:text-zinc-700"
                    placeholder={`Ex:\n- Sempre termine com "Abraços da equipe Allcance! 🚴"\n- Nunca ofereça desconto sem consultar o atendente\n- Se o cliente pedir prazo de pagamento, encaminhe para um humano`}
                    value={effectiveAiInstructions}
                    onChange={(e) => setAiInstructionsText(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    onClick={handleSaveAiInstructions}
                    disabled={updateAiInstructions.isPending}
                  >
                    <Save size={16} />
                    Salvar Instruções
                  </Button>
                </div>
              </ConfigSection>

              {/* 6. Lembretes de Agenda */}
              <ConfigSection
                title="Lembretes WhatsApp"
                description="Defina o número que receberá os alertas automáticos da agenda."
                icon={Bell}
                active={activeTab === "agenda_notifications"}
                onClick={() => toggle("agenda_notifications")}
                summary={
                  whatsappNumber ? (
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">Configurado</span>
                  ) : null
                }
              >
                <div className="space-y-6">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-primary">
                      Número do WhatsApp
                    </label>
                    <div className="relative">
                      <input
                        placeholder="5511999999999"
                        className="premium-input h-16 text-2xl font-black tracking-widest"
                        value={effectiveWhatsApp}
                        onChange={(e) => setWhatsappText(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2 font-medium">
                      Use o formato internacional sem espaços ou símbolos. Ex: 5511999999999
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSaveWhatsApp}
                    disabled={updateWhatsApp.isPending}
                  >
                    <Save size={16} />
                    Salvar Número
                  </Button>
                </div>
              </ConfigSection>
            </>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Cpu size={14} />
          <span className="text-[8px] font-black uppercase tracking-[0.4em]">
            Core Protocol v4.2 // Encrypted
          </span>
        </div>
      </footer>

      <style>{`
        .premium-input {
          width: 100%;
          background: #0A0A0B;
          border: 1px solid #27272a;
          border-radius: 20px;
          padding: 0 24px;
          color: #f4f4f5;
          outline: none;
          transition: all 0.2s;
          font-family: inherit;
        }
        .premium-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 10%, transparent);
          background: #111113;
        }
      `}</style>
    </div>
  );
}
