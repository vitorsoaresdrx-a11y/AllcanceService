import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Terminal, 
  CheckCircle2, 
  Plus, 
  Calendar, 
  Clock, 
  Trash2, 
  Loader2,
  Circle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DeveloperTask {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  completed: boolean;
  created_at: string;
}

export default function DeveloperTasks() {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // 1. Fetch Tasks (Done at the bottom)
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["developer_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_tasks" as any)
        .select("*")
        .order("completed", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DeveloperTask[];
    },
  });

  // 2. Create Task Mutation
  const addTask = useMutation({
    mutationFn: async (task: Partial<DeveloperTask>) => {
      const { data, error } = await supabase.from("developer_tasks" as any).insert(task).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["developer_tasks"] });
      toast.success("Task adicionada!");
      setNewTitle("");
      setNewDesc("");
      setNewDeadline("");
      setIsAdding(false);
    },
  });

  // 3. Toggle Complete Mutation
  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("developer_tasks" as any).update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["developer_tasks"] }),
  });

  // 4. Delete Task Mutation
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("developer_tasks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["developer_tasks"] });
      toast.success("Task removida!");
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask.mutate({
      title: newTitle,
      description: newDesc,
      deadline: newDeadline || null,
      completed: false
    });
  };

  return (
    <div className="min-h-full bg-background text-foreground pb-20">
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Terminal className="text-white w-5 h-5" />
              </div>
              <h1 className="text-3xl font-black italic uppercase tracking-tight text-white">Developer</h1>
            </div>
            <p className="text-muted-foreground text-sm font-medium ml-1">Painel de melhorias e tarefas do sistema</p>
          </div>
          
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="h-12 px-6 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={16} /> Nova Task
          </button>
        </header>

        {/* Add Form */}
        {isAdding && (
          <form onSubmit={handleAdd} className="bg-card border border-border/50 rounded-3xl p-6 md:p-8 space-y-5 animate-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Título da Task</label>
                <input 
                  autoFocus
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-14 bg-background border border-border rounded-2xl px-5 text-sm font-bold text-white focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30"
                  placeholder="Ex: Melhorar carregamento da aba Oficina..."
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prazo (Opcional)</label>
                <div className="relative">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input 
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full h-14 bg-background border border-border rounded-2xl pl-12 pr-5 text-sm font-bold text-white focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrição / Detalhes</label>
                <textarea 
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-background border border-border rounded-2xl p-5 text-sm font-bold text-white focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30 resize-none"
                  placeholder="Descreva o que precisa ser feito..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="h-12 px-6 rounded-2xl bg-secondary text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:bg-secondary/80 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={addTask.isPending}
                className="h-12 px-8 rounded-2xl bg-zinc-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-600 transition-all flex items-center gap-2"
              >
                {addTask.isPending ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Criar Task</>}
              </button>
            </div>
          </form>
        )}

        {/* Task List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest">Carregando Tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-20 text-center space-y-3 opacity-20">
            <Terminal size={40} className="mx-auto" />
            <p className="text-xs font-black uppercase tracking-widest">Nenhuma tarefa pendente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className={`group bg-card border border-border/50 rounded-3xl p-5 md:p-6 flex items-start gap-4 transition-all hover:border-primary/20 ${task.completed ? 'opacity-50' : 'hover:bg-primary/5 shadow-sm'}`}
              >
                <button 
                  onClick={() => toggleComplete.mutate({ id: task.id, completed: !task.completed })}
                  className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center transition-all ${task.completed ? 'bg-zinc-500 scale-110 shadow-lg shadow-emerald-500/20' : 'border-2 border-border group-hover:border-primary'}`}
                >
                  {task.completed ? <CheckCircle2 size={14} className="text-white" /> : <Circle size={14} className="opacity-0" />}
                </button>

                <div className="flex-1 space-y-1">
                  <h3 className={`font-black text-sm uppercase tracking-tight transition-all ${task.completed ? 'line-through text-muted-foreground' : 'text-white'}`}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className={`text-xs leading-relaxed ${task.completed ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 pt-2">
                    {task.deadline && (
                      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${task.completed ? 'text-muted-foreground/40' : 'text-primary/70'}`}>
                        <Clock size={12} />
                        Prazo: {format(new Date(task.deadline), "dd 'de' MMM", { locale: ptBR })}
                      </div>
                    )}
                    <div className="text-[10px] font-bold text-muted-foreground/40 uppercase">
                      Criada em: {format(new Date(task.created_at), "dd/MM", { locale: ptBR })}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => deleteTask.mutate(task.id)}
                  className="p-3 rounded-2xl bg-zinc-500/5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-500/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
