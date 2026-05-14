import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Wrench,
  CheckCircle2,
  Clock,
  User,
  Loader2,
  Check,
  Bell,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useServiceOrders,
  useAcceptServiceOrder,
  useFinishServiceOrder,
  useServiceOrdersRealtime,
  type ServiceOrder,
} from "@/hooks/useServiceOrders";
import { useActiveMechanics } from "@/hooks/useMechanics";
import { useCreateBikeServiceRecord } from "@/hooks/useBikeServiceHistory";
import { useSendMessage } from "@/hooks/useWhatsApp";
import { playDoneSound, playNewOrderSound } from "@/lib/sounds";
import { FrameNumberInput } from "@/components/mechanics/FrameNumberInput";
import { toast } from "sonner";

const mobileColumns = [
  { key: "pending" as const, label: "Pendentes", icon: Clock, color: "text-zinc-400", bg: "bg-zinc-400/5", border: "border-zinc-400/20" },
  { key: "accepted" as const, label: "Em Andamento", icon: Wrench, color: "text-zinc-400", bg: "bg-zinc-400/5", border: "border-zinc-400/20" },
];

export default function Mecanicos() {
  const { data: orders = [], isLoading } = useServiceOrders(["pending", "accepted"]);
  const acceptOrder = useAcceptServiceOrder();
  const finishOrder = useFinishServiceOrder();
  const { data: mechanics = [] } = useActiveMechanics();
  const createHistory = useCreateBikeServiceRecord();
  const sendMessage = useSendMessage();

  const handleNewOrder = useCallback((order: ServiceOrder) => {
    playNewOrderSound();
    toast.info(`🔔 Nova OS recebida!`, {
      description: order.bike_name || order.problem?.slice(0, 50),
      duration: 6000,
    });
  }, []);

  useServiceOrdersRealtime({ onNew: handleNewOrder });

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<ServiceOrder | null>(null);
  const [frameNumbers, setFrameNumbers] = useState<Record<string, string>>({});
  const [mobileTab, setMobileTab] = useState<"pending" | "accepted">("pending");

  const handleAcceptClick = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setAcceptOpen(true);
  };

  const handleSelectMechanic = (mechanicId: string, mechanicName: string) => {
    if (!selectedOrder) return;
    acceptOrder.mutate(
      { id: selectedOrder.id, mechanic_id: mechanicId, mechanic_name: mechanicName },
      {
        onSuccess: async () => {
          // Atualiza também o status na tabela mechanic_jobs para sincronizar o Kanban
          await supabase.from("mechanic_jobs" as any).update({ status: "in_maintenance" }).eq("id", selectedOrder.id);

          if (selectedOrder.customer_whatsapp) {
            const phone = selectedOrder.customer_whatsapp.replace(/\D/g, "");
            const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;
            sendMessage.mutate({
              phone: formattedPhone,
              message: `Novidades! Um mecânico começou a mexer na sua bicicleta (${selectedOrder.bike_name || "sua bike"}). Logo, logo fica pronto e eu te dou um toque por aqui!`
            });
          }
          toast.success("OS aceita!");
          setAcceptOpen(false);
          setSelectedOrder(null);
        },
        onError: () => toast.error("Erro ao aceitar OS"),
      }
    );
  };

  const handleFinish = async (order: ServiceOrder, skipFrameNum = false) => {
    let frame = frameNumbers[order.id]?.trim() || "";
    if (!skipFrameNum && !frame) {
      toast.error("Preencha o número do quadro");
      return;
    }
    if (skipFrameNum) {
      frame = "sem numero";
    }

    try {
      await finishOrder.mutateAsync({ id: order.id, frame_number: frame });
      
      // Atualiza também o status na tabela mechanic_jobs para sincronizar o Kanban
      await supabase.from("mechanic_jobs" as any).update({ status: "in_analysis" }).eq("id", order.id);

      if (order.customer_whatsapp) {
        const phone = order.customer_whatsapp.replace(/\D/g, "");
        const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;
        sendMessage.mutate({
          phone: formattedPhone,
          message: "Opa! Os mecânicos já finalizaram sua bike e a gente está fazendo uma revisão minuciosa para garantir que tudo está perfeito. Logo, logo, te avisamos quando ficar pronta!"
        });
      }

      await createHistory.mutateAsync({
        frame_number: frame,
        bike_name: order.bike_name || "Bike",
        customer_name: order.customer_name || undefined,
        customer_cpf: order.customer_cpf || undefined,
        customer_phone: order.customer_whatsapp || undefined,
        problem: order.problem,
        mechanic_id: order.mechanic_id || undefined,
        mechanic_name: order.mechanic_name || undefined,
        service_order_id: order.id,
        status: "done",
        sem_custo: order.sem_custo,
        completed_at: new Date().toISOString(),
      });
      playDoneSound();
      toast.success("Serviço finalizado!");
    } catch {
      toast.error("Erro ao finalizar");
    }
  };

  const pending = orders.filter((o) => o.mechanic_status === "pending");
  const accepted = orders.filter((o) => o.mechanic_status === "accepted");

  const grouped: Record<string, ServiceOrder[]> = { pending, accepted };

  // Observação discreta sempre visível no card
  const renderInlineObservation = (order: ServiceOrder) => {
    if (!order.problem) return null;
    return (
      <p className="text-[11px] text-muted-foreground/60 line-clamp-2 leading-relaxed">
        {order.problem}
      </p>
    );
  };

  const renderPendingCard = (order: ServiceOrder) => (
    <div
      key={order.id}
      className="bg-card border border-border rounded-2xl p-5 space-y-4 hover:border-zinc-400/30 transition-all"
    >
      {/* Clica no topo para abrir modal de observações */}
      <button onClick={() => setDetailOrder(order)} className="w-full text-left space-y-2">
        <div className="space-y-1">
          {order.bike_name && <p className="text-sm font-black text-white uppercase">{order.bike_name}</p>}
          {order.customer_name && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <User size={12} /> {order.customer_name}
            </div>
          )}
        </div>
        {renderInlineObservation(order)}
      </button>

      <button
        onClick={() => handleAcceptClick(order)}
        className="w-full h-10 rounded-xl bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-zinc-500/20"
      >
        Aceitar
      </button>
    </div>
  );

  const renderAcceptedCard = (order: ServiceOrder) => (
    <div
      key={order.id}
      className="bg-card border border-border rounded-2xl p-5 space-y-4 hover:border-zinc-400/30 transition-all"
    >
      <button onClick={() => setDetailOrder(order)} className="w-full text-left space-y-2">
        <div className="space-y-1">
          {order.bike_name && <p className="text-sm font-black text-white uppercase">{order.bike_name}</p>}
          {order.customer_name && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <User size={12} /> {order.customer_name}
            </div>
          )}
          {order.mechanic_name && (
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <Wrench size={12} /> {order.mechanic_name}
            </div>
          )}
        </div>
        {renderInlineObservation(order)}
      </button>

      <div className="space-y-2">
        <FrameNumberInput
          value={frameNumbers[order.id] || ""}
          onChange={(val) => setFrameNumbers((prev) => ({ ...prev, [order.id]: val }))}
        />
        <button
          onClick={() => handleFinish(order)}
          disabled={finishOrder.isPending || createHistory.isPending}
          className="w-full h-10 rounded-xl bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-zinc-500/20 disabled:opacity-50"
        >
          {finishOrder.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Finalizar</>}
        </button>
        <button
          onClick={() => handleFinish(order, true)}
          disabled={finishOrder.isPending || createHistory.isPending}
          className="w-full h-8 rounded-xl bg-transparent text-muted-foreground hover:text-white hover:bg-muted text-[10px] font-bold uppercase tracking-widest flex items-center justify-center transition-all disabled:opacity-50"
        >
          Finalizar sem número
        </button>
      </div>
    </div>
  );

  const renderDoneCard = (order: ServiceOrder) => (
    <div
      key={order.id}
      className="bg-card border border-zinc-500/20 rounded-2xl p-5 space-y-3 opacity-60"
    >
      <button onClick={() => setDetailOrder(order)} className="w-full text-left space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            {order.bike_name && <p className="text-sm font-black text-white uppercase">{order.bike_name}</p>}
            {order.mechanic_name && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Wrench size={12} /> {order.mechanic_name}
              </div>
            )}
          </div>
          <span className="px-3 py-1 rounded-full bg-zinc-500/10 text-zinc-400 text-[10px] font-black uppercase border border-zinc-500/20 shrink-0">
            Concluído
          </span>
        </div>
        {renderInlineObservation(order)}
      </button>
    </div>
  );

  const renderCards = (key: string) => {
    const list = grouped[key] || [];
    if (list.length === 0) {
      const emptyIcon = key === "pending" ? Bell : key === "accepted" ? Wrench : CheckCircle2;
      const EmptyIcon = emptyIcon;
      return (
        <div className="py-16 text-center space-y-2 opacity-20">
          <EmptyIcon className="mx-auto" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma OS</p>
        </div>
      );
    }
    if (key === "pending") return list.map(renderPendingCard);
    return list.map(renderAcceptedCard);
  };

  return (
    <div className="min-h-full bg-background text-foreground pb-24 lg:pb-0">
      <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 md:p-8 lg:p-12 space-y-6 md:space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30">
              <Wrench className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-sm font-black tracking-widest text-primary">MECÂNICOS</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight italic uppercase text-white">
            Painel do Mecânico
          </h1>
          <p className="text-muted-foreground font-medium text-sm">Ordens de serviço em tempo real</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-card border border-zinc-400/20 p-4 rounded-2xl">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Pendentes</p>
            <p className="text-2xl font-black text-zinc-400">{pending.length}</p>
          </div>
          <div className="bg-card border border-zinc-400/20 p-4 rounded-2xl">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Em Andamento</p>
            <p className="text-2xl font-black text-zinc-400">{accepted.length}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
          </div>
        ) : (
          <>
            <div className="flex md:hidden overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {mobileColumns.map((col) => {
                const active = mobileTab === col.key;
                return (
                  <button
                    key={col.key}
                    onClick={() => setMobileTab(col.key)}
                    className={`snap-start shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-wider transition-all ${
                      active
                        ? `${col.bg} ${col.border} ${col.color}`
                        : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    <col.icon size={14} />
                    <span className="whitespace-nowrap">{col.label}</span>
                    <span className={`ml-1 text-[10px] ${active ? "opacity-100" : "opacity-50"}`}>
                      ({grouped[col.key].length})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="md:hidden space-y-4">{renderCards(mobileTab)}</div>

            <div className="hidden md:grid md:grid-cols-2 gap-6 items-start">
              <section className="bg-card/50 rounded-3xl p-4 border border-zinc-400/10 min-h-[400px]">
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-400/20 bg-zinc-400/5 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 bg-white/5">
                    <Clock size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Pendentes</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{pending.length} OS aguardando</p>
                  </div>
                </div>
                <div className="space-y-4 px-1">{renderCards("pending")}</div>
              </section>

              <section className="bg-card/50 rounded-3xl p-4 border border-zinc-400/10 min-h-[400px]">
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-400/20 bg-zinc-400/5 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 bg-white/5">
                    <Wrench size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Em Andamento</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{accepted.length} OS em execução</p>
                  </div>
                </div>
                <div className="space-y-4 px-1">{renderCards("accepted")}</div>
              </section>
            </div>

          </>
        )}
      </div>

      {/* Modal de observações */}
      <Dialog open={!!detailOrder} onOpenChange={(v) => { if (!v) setDetailOrder(null); }}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-3xl p-0 overflow-hidden max-w-md shadow-2xl w-full">
          <div className="p-6 md:p-8 space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText size={16} className="text-primary" />
                </div>
                <div>
                  {detailOrder?.bike_name && (
                    <DialogTitle className="text-base font-black text-white uppercase tracking-tight">
                      {detailOrder.bike_name}
                    </DialogTitle>
                  )}
                  {detailOrder?.customer_name && (
                    <p className="text-[11px] text-muted-foreground">{detailOrder.customer_name}</p>
                  )}
                </div>
              </div>
            </DialogHeader>
            <div className="p-4 bg-background rounded-2xl border border-border/50 min-h-[120px]">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">O que fazer</p>
              <p className="text-sm text-foreground leading-relaxed">
                {detailOrder?.problem || "Nenhuma observação registrada."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de seleção de mecânico */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-md shadow-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 md:p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-white italic uppercase tracking-tight">
                Selecionar Mecânico
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {mechanics.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhum mecânico cadastrado</p>
              ) : (
                mechanics.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMechanic(m.id, m.name)}
                    disabled={acceptOrder.isPending}
                    className="w-full h-14 bg-card border border-border rounded-2xl px-5 text-left text-sm font-bold text-white hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User size={16} className="text-primary" />
                    </div>
                    {m.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
