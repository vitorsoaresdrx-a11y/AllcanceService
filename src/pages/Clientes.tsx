import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { Search, Download, Phone, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomers } from "@/hooks/useCustomers";
import { EmptyState } from "@/components/EmptyState";
import { PaginationBar } from "@/components/PaginationBar";
import { usePagination } from "@/hooks/usePagination";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function Clientes() {
  const navigate = useNavigate();
  const { data: customers = [], isLoading } = useCustomers();
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return customers;
    const q = debouncedSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.whatsapp && c.whatsapp.includes(q)) ||
        (c.cpf && c.cpf.includes(q))
    );
  }, [customers, debouncedSearch]);

  const pagination = usePagination(filtered);

  const handleExportCSV = () => {
    const header = "Nome,WhatsApp,CPF,Cadastrado em";
    const rows = filtered.map(
      (c) =>
        `"${c.name}","${c.whatsapp || ""}","${c.cpf || ""}","${formatDate(c.created_at)}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Clientes</h1>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, WhatsApp ou CPF..."
          className="bg-card border-border h-9 text-sm pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState type={search ? "search" : "customers"} />
      ) : (
        <>
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">WhatsApp</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">CPF</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="px-3 py-2.5 text-foreground font-medium flex items-center gap-2">{c.name} <ChevronRight className="h-3 w-3 text-muted-foreground" /></td>
                    <td className="px-3 py-2.5">
                      {c.whatsapp ? (
                        <a
                          href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {c.whatsapp}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
                      {c.cpf || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar {...pagination} onPrev={pagination.prev} onNext={pagination.next} />
        </>
      )}
    </div>
  );
}
