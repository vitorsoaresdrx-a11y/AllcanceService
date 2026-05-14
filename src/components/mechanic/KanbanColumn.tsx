import { LucideIcon, Layers } from "lucide-react";
import { MechanicJob } from "@/hooks/useMechanicJobs";
import { MechanicCard } from "./MechanicCard";

interface KanbanColumnProps {
  col: {
    key: string;
    label: string;
    icon: LucideIcon;
    color: string;
    bg: string;
    border: string;
  };
  jobs: MechanicJob[];
  onAddRepair: (j: MechanicJob) => void;
  onEdit: (j: MechanicJob) => void;
  onRetreat?: (j: MechanicJob) => void;
  onAdvance?: (j: MechanicJob) => void;
  onFinalize?: (j: MechanicJob) => void;
  onOpenControl: (j: MechanicJob) => void;
}

export function KanbanColumn({ 
  col, 
  jobs, 
  onAddRepair, 
  onEdit, 
  onRetreat, 
  onAdvance, 
  onFinalize, 
  onOpenControl 
}: KanbanColumnProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-muted/20 rounded-lg p-3 border shadow-sm">
      <ColumnHeader 
        label={col.label} 
        icon={col.icon} 
        color={col.color} 
        bg={col.bg} 
        border={col.border} 
        count={jobs.length} 
      />
      
      <div className="space-y-3 pb-6 flex-1">
        {jobs.length > 0 ? (
          jobs.map((job) => (
            <MechanicCard 
              key={job.id} 
              job={job} 
              isLast={col.key === "ready"} 
              columnKey={col.key} 
              onAddRepair={onAddRepair} 
              onEdit={onEdit} 
              onRetreat={onRetreat} 
              onAdvance={col.key !== "ready" ? onAdvance : undefined} 
              onFinalize={col.key === "ready" ? onFinalize : undefined} 
              onOpenControl={onOpenControl}
              isMechanicView={col.key === "in_repair"}
            />
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20">
            <Layers size={32} />
            <p className="text-[10px] font-bold uppercase tracking-widest mt-3">Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnHeader({ label, icon: Icon, color, bg, border, count }: any) {
  return (
    <div className="flex items-center justify-between mb-4 px-1">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${bg} ${border} border`}>
          <Icon size={14} className={color} />
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">{label}</h3>
      </div>
      <div className="bg-muted px-2 py-0.5 rounded-full border border-border/50">
        <span className="text-[9px] font-bold text-muted-foreground">{count}</span>
      </div>
    </div>
  );
}
