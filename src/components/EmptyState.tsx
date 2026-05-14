import { Package, FileText, Users, Wrench, Search, ShoppingBag } from "lucide-react";

interface EmptyStateProps {
  type?: "products" | "bikes" | "customers" | "orders" | "sales" | "search" | "generic";
  title?: string;
  description?: string;
}

const config = {
  products: { icon: Package, title: "Nenhum produto cadastrado", description: "Adicione seu primeiro produto para começar." },
  bikes: { icon: Package, title: "Nenhuma bike cadastrada", description: "Cadastre seu primeiro modelo de bike." },
  customers: { icon: Users, title: "Nenhum cliente encontrado", description: "Seus clientes aparecerão aqui." },
  orders: { icon: Wrench, title: "Nenhuma ordem de serviço", description: "As ordens de serviço aparecerão aqui." },
  sales: { icon: ShoppingBag, title: "Nenhuma venda registrada", description: "Registre vendas pelo PDV." },
  search: { icon: Search, title: "Nenhum resultado", description: "Tente buscar com outros termos." },
  generic: { icon: FileText, title: "Nada por aqui", description: "Não há dados para exibir." },
};

export function EmptyState({ type = "generic", title, description }: EmptyStateProps) {
  const c = config[type];
  const Icon = c.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
        <Icon size={28} className="text-muted-foreground/70" />
      </div>
      <h3 className="text-sm font-bold text-muted-foreground mb-1">{title || c.title}</h3>
      <p className="text-xs text-muted-foreground/70 text-center max-w-[250px]">{description || c.description}</p>
    </div>
  );
}
