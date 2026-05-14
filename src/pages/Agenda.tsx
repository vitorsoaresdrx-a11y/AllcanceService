import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, Type, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type AgendaItem = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'evento' | 'periodo' | 'lembrete';
  data_inicio: string;
  data_fim: string | null;
  dia_inteiro: boolean;
};

const Agenda = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form State
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<'evento' | 'periodo' | 'lembrete'>('evento');
  const [formFullDay, setFormFullDay] = useState(false);
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");

  useEffect(() => {
    fetchAgenda();
  }, [currentDate]);

  const fetchAgenda = async () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const { data, error } = await supabase
      .from('agenda')
      .select('*')
      .gte('data_inicio', start.toISOString())
      .lte('data_inicio', end.toISOString());

    if (error) {
      toast({ title: "Erro ao carregar agenda", variant: "destructive" });
    } else {
      setItems(data || []);
    }
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }),
  });

  const getDayItems = (day: Date) => items.filter(item => isSameDay(new Date(item.data_inicio), day));

  const handleSave = async () => {
    if (!formTitle || !selectedDay) return;
    setIsLoading(true);

    const startDateTime = new Date(selectedDay);
    const [h, m] = formStart.split(":").map(Number);
    startDateTime.setHours(h, m, 0);

    const endDateTime = new Date(selectedDay);
    if (formType === 'periodo') {
      const [eh, em] = formEnd.split(":").map(Number);
      endDateTime.setHours(eh, em, 0);
    }

    const payload = {
      titulo: formTitle,
      descricao: formDesc,
      tipo: formType,
      data_inicio: startDateTime.toISOString(),
      data_fim: formType === 'periodo' ? endDateTime.toISOString() : null,
      dia_inteiro: formFullDay,
    };

    const { error } = editingItem 
      ? await supabase.from('agenda').update(payload).eq('id', editingItem.id)
      : await supabase.from('agenda').insert([payload]);

    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } else {
      toast({ title: "Salvo com sucesso!" });
      setIsModalOpen(false);
      fetchAgenda();
      resetForm();
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormType('evento');
    setFormFullDay(false);
    setFormStart("09:00");
    setFormEnd("10:00");
    setEditingItem(null);
  };

  const openEdit = (item: AgendaItem) => {
    setEditingItem(item);
    setFormTitle(item.titulo);
    setFormDesc(item.descricao);
    setFormType(item.tipo);
    setFormFullDay(item.dia_inteiro);
    const date = new Date(item.data_inicio);
    setFormStart(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
    if (item.data_fim) {
       const endDate = new Date(item.data_fim);
       setFormEnd(`${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('agenda').delete().eq('id', editingItem.id);
    if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
    else {
      toast({ title: "Excluído!" });
      setIsModalOpen(false);
      fetchAgenda();
    }
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-6xl mx-auto pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Agenda Interna</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestão de eventos e lembretes Rodonaves</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm md:text-lg font-bold min-w-[120px] md:min-w-[150px] text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h3>
          <Button variant="outline" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-6 md:gap-8">
        <Card className="p-2 md:p-4 border-2">
          <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden border border-muted">
            {["D", "S", "T", "Q", "Q", "S", "S"].map(day => (
              <div key={day} className="bg-background py-2 md:py-3 text-center text-[10px] md:text-xs font-black uppercase text-muted-foreground">{day}</div>
            ))}
            {days.map((day, i) => {
              const dayItems = getDayItems(day);
              const isSelected = isSameDay(day, selectedDay || new Date());
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[60px] md:min-h-[100px] bg-background p-1 md:p-2 cursor-pointer transition-all hover:bg-muted/30 relative
                    ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                    ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}
                  `}
                >
                  <span className={`text-xs md:text-sm font-bold ${isSelected ? 'text-primary' : ''}`}>{format(day, "d")}</span>
                  <div className="flex flex-wrap gap-0.5 md:gap-1 mt-1 md:mt-2">
                    {dayItems.slice(0, 4).map(item => (
                      <div key={item.id} className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
                        item.tipo === 'evento' ? 'bg-zinc-500 shadow-[0_0_8px_rgba(161,161,170,0.5)]' : 
                        item.tipo === 'periodo' ? 'bg-zinc-500' : 'bg-zinc-500'
                      }`} />
                    ))}
                    {dayItems.length > 4 && <div className="text-[8px] font-bold text-muted-foreground">+{dayItems.length - 4}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 md:p-6 border-2 flex flex-col h-auto md:h-[650px]">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="font-black text-lg md:text-xl uppercase tracking-widest">{format(selectedDay || new Date(), "dd 'de' MMMM", { locale: ptBR })}</h3>
            <Button size="icon" className="rounded-full h-8 w-8" onClick={() => { resetForm(); setIsModalOpen(true); }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 -mx-2 px-2 max-h-[400px] md:max-h-full">
            <div className="space-y-4">
              {selectedDay && getDayItems(selectedDay).length > 0 ? (
                getDayItems(selectedDay).map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => openEdit(item)}
                    className="p-4 rounded-xl border-2 hover:border-primary transition-all cursor-pointer group bg-muted/20 relative overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      item.tipo === 'evento' ? 'bg-zinc-500' : 
                      item.tipo === 'periodo' ? 'bg-zinc-500' : 'bg-zinc-500'
                    }`} />
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm mb-1">{item.titulo}</h4>
                      <span className="text-[10px] font-black uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{item.tipo}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.descricao}</p>
                    {item.tipo !== 'lembrete' && (
                      <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-primary">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.data_inicio), "HH:mm")}
                        {item.data_fim && ` — ${format(new Date(item.data_fim), "HH:mm")}`}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-muted-foreground opacity-50">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">Nenhum evento neste dia.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsModalOpen(open); }}>
        <DialogContent className="sm:max-w-[450px] border-2">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
              {editingItem ? "Editar Compromisso" : "Novo Compromisso"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-muted-foreground">Título</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Reunião Rodonaves..." className="h-12 text-lg font-bold" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-muted-foreground">Tipo de Entrada</label>
              <div className="grid grid-cols-3 gap-2">
                {(['evento', 'periodo', 'lembrete'] as const).map(t => (
                  <Button 
                    key={t}
                    variant={formType === t ? 'default' : 'outline'}
                    onClick={() => setFormType(t)}
                    className="capitalize font-bold h-10"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-muted-foreground">Início</label>
                <Input type="time" disabled={formType === 'lembrete'} value={formStart} onChange={(e) => setFormStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-muted-foreground">Fim</label>
                <Input type="time" disabled={formType !== 'periodo'} value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="allday" disabled={formType === 'lembrete'} checked={formFullDay} onCheckedChange={(c) => setFormFullDay(!!c)} />
              <label htmlFor="allday" className="text-xs font-bold leading-none peer-disabled:opacity-70">DIA INTEIRO</label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-muted-foreground">Descrição (Opcional)</label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Detalhes adicionais..." rows={3} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {editingItem && (
               <Button variant="destructive" onClick={handleDelete} className="font-bold">EXCLUIR</Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold">CANCELAR</Button>
              <Button onClick={handleSave} disabled={isLoading} className="font-extrabold flex-1">
                {isLoading ? "SALVANDO..." : "SALVAR COMPROMISSO"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
