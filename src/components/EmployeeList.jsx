import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, RefreshCw, Users, Loader2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

export default function EmployeeList({ refreshKey, onReRegister }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, department, active, face_embeddings(id)")
      .eq("active", true)
      .order("name");
    setEmployees(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees, refreshKey]);

  const handleDelete = async (emp) => {
    setDeleting(emp.id);
    try {
      await supabase.from("face_embeddings").delete().eq("employee_id", emp.id);
      await supabase.from("employees").update({ active: false }).eq("id", emp.id);
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Erro ao excluir:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleReRegister = (emp) => {
    onReRegister?.({ name: emp.name, email: emp.email, department: emp.department || "" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-xs font-bold">Carregando funcionários...</span>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users size={24} className="mx-auto mb-2 opacity-30" />
        <p className="text-xs font-bold opacity-50">Nenhum funcionário cadastrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap">
          <Users size={11} /> Funcionários Cadastrados ({employees.length})
        </h2>
        <button
          onClick={fetchEmployees}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="space-y-2">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{emp.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{emp.email}</p>
              {emp.department && (
                <p className="text-[10px] text-muted-foreground/60 truncate">{emp.department}</p>
              )}
              <p className={`text-[10px] font-bold mt-0.5 ${emp.face_embeddings ? "text-emerald-400" : "text-amber-400"}`}>
                {emp.face_embeddings ? "✓ Rosto cadastrado" : "⚠ Sem rosto"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleReRegister(emp)}
                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                title="Recadastrar rosto"
              >
                <RefreshCw size={13} />
              </button>

              <button
                onClick={() => setDeleteTarget(emp)}
                className="w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                title="Excluir funcionário"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Excluir funcionário"
        description={`Tem certeza que deseja excluir ${deleteTarget?.name}? O cadastro facial será removido e esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
