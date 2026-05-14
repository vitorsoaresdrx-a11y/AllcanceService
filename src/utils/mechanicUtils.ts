import { MechanicJob, MechanicJobAddition } from "@/hooks/useMechanicJobs";

export function getAdditionTotal(a: MechanicJobAddition) {
  if (!a) return 0;
  const parts = Array.isArray(a.parts_used) ? a.parts_used : [];
  const partsTotal = parts.reduce(
    (sum, p) => sum + (Number(p?.quantity) || 0) * (Number(p?.unit_price) || 0),
    0
  );
  return Number(a.labor_cost || 0) + partsTotal;
}

export function getTotalPrice(job: MechanicJob | null) {
  if (!job) return 0;
  if (job.sem_custo) return 0;
  const base = Number(job.price || 0);
  const accepted = (Array.isArray(job.additions) ? job.additions : [])
    .filter((a) => {
      const status = (a?.approval as string);
      return status === "accepted" || status === "aprovado";
    })
    .reduce((sum, a) => sum + getAdditionTotal(a), 0);
  return base + accepted;
}
