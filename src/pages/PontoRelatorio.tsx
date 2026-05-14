import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  CalendarDays,
  Timer,
  Coffee,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  FileDown,
} from "lucide-react";
import { exportEmployeePontoPDF } from "@/lib/export-ponto-pdf";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  name: string;
  department: string | null;
  active: boolean;
}

interface TimeRecord {
  id: string;
  employee_id: string;
  type: string;
  timestamp: string;
  date: string;
  confidence: number | null;
}

interface DaySummary {
  date: Date;
  hoursWorked: number;
  breakMinutes: number;
  clockIn: string | null;
  clockOut: string | null;
  records: TimeRecord[];
  isAbsent: boolean;
  isWeekend: boolean;
}

interface EmployeeSummary {
  employee: Employee;
  days: DaySummary[];
  totalHours: number;
  totalBreakMinutes: number;
  daysWorked: number;
  absences: number;
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

export default function PontoRelatorio() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const daysInMonth = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const workDays = useMemo(() => daysInMonth.filter((d) => !isWeekend(d) && d <= new Date()), [daysInMonth]);

  const prevMonth = () => setCurrentMonth((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() - 1)));
  const nextMonth = () => setCurrentMonth((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() + 1)));

  // Use string keys for stable dependency
  const startDateStr = format(monthStart, "yyyy-MM-dd");
  const endDateStr = format(monthEnd, "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    setLoading(true);

    const [empRes, recRes] = await Promise.all([
      supabase.from("employees").select("id, name, department, active").eq("active", true).order("name"),
      supabase
        .from("time_records")
        .select("id, employee_id, type, timestamp, date, confidence")
        .gte("date", startDateStr)
        .lte("date", endDateStr)
        .order("timestamp", { ascending: true }),
    ]);

    setEmployees(empRes.data || []);
    setRecords(recRes.data || []);
    setLoading(false);
  }, [startDateStr, endDateStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summaries: EmployeeSummary[] = useMemo(() => {
    return employees.map((emp) => {
      const empRecords = records.filter((r) => r.employee_id === emp.id);

      const days: DaySummary[] = daysInMonth.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayRecords = empRecords.filter((r) => r.date === dayStr).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        let hoursWorked = 0;
        let breakMinutes = 0;
        let clockIn: string | null = null;
        let clockOut: string | null = null;

        let lastIn: Date | null = null;
        let lastBreakOut: Date | null = null;

        for (const r of dayRecords) {
          const ts = new Date(r.timestamp);
          if (r.type === "clock_in") {
            if (!clockIn) clockIn = format(ts, "HH:mm");
            lastIn = ts;
          } else if (r.type === "clock_out") {
            clockOut = format(ts, "HH:mm");
            if (lastIn) {
              hoursWorked += (ts.getTime() - lastIn.getTime()) / 3600000;
              lastIn = null;
            }
          } else if (r.type === "break_out") {
            if (lastIn) {
              hoursWorked += (ts.getTime() - lastIn.getTime()) / 3600000;
              lastIn = null;
            }
            lastBreakOut = ts;
          } else if (r.type === "break_in") {
            if (lastBreakOut) {
              breakMinutes += (ts.getTime() - lastBreakOut.getTime()) / 60000;
              lastBreakOut = null;
            }
            lastIn = ts;
          }
        }

        // If still clocked in today
        if (lastIn && isSameDay(day, new Date())) {
          hoursWorked += (Date.now() - lastIn.getTime()) / 3600000;
        }
        if (lastBreakOut && isSameDay(day, new Date())) {
          breakMinutes += (Date.now() - lastBreakOut.getTime()) / 60000;
        }

        const weekend = isWeekend(day);
        const isPast = day < new Date() && !isSameDay(day, new Date());
        const isAbsent = !weekend && isPast && dayRecords.length === 0;

        return { date: day, hoursWorked, breakMinutes, clockIn, clockOut, records: dayRecords, isAbsent, isWeekend: weekend };
      });

      const totalHours = days.reduce((sum, d) => sum + d.hoursWorked, 0);
      const totalBreakMinutes = days.reduce((sum, d) => sum + d.breakMinutes, 0);
      const daysWorked = days.filter((d) => d.records.length > 0).length;
      const absences = days.filter((d) => d.isAbsent).length;

      return { employee: emp, days, totalHours, totalBreakMinutes, daysWorked, absences };
    });
  }, [employees, records, daysInMonth]);

  return (
    <div className="min-h-full bg-background text-foreground font-sans pb-24 lg:pb-0">
      <div className="max-w-6xl mx-auto p-4 md:p-12 space-y-4 md:space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0 shadow-black/20">
            <CalendarDays size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-tight whitespace-nowrap">Relatório de Ponto</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Controle de Frequência Mensal</p>
          </div>
        </div>

        {/* Month Selector — arrows inside card */}
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3 mb-4">
          <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="text-sm font-black capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</p>
            <p className="text-[10px] text-muted-foreground">{workDays.length} dias úteis</p>
          </div>
          <button
            onClick={nextMonth}
            disabled={startOfMonth(new Date()).getTime() <= currentMonth.getTime()}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Summary Cards */}
        {!loading && summaries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-card border border-border">
              <Users size={14} className="text-primary mb-2" />
              <p className="text-2xl font-black text-foreground">{employees.length}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">Funcionários</p>
            </div>
            <div className="p-3 rounded-2xl bg-card border border-border">
              <Timer size={14} className="text-zinc-400 mb-2" />
              <p className="text-lg font-black text-foreground whitespace-nowrap">
                {formatDuration(summaries.reduce((s, e) => s + e.totalHours * 60, 0) / Math.max(employees.length, 1))}
              </p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">Média Horas/Func.</p>
            </div>
            <div className="p-3 rounded-2xl bg-card border border-border">
              <Coffee size={14} className="text-zinc-400 mb-2" />
              <p className="text-lg font-black text-foreground whitespace-nowrap">
                {formatDuration(summaries.reduce((s, e) => s + e.totalBreakMinutes, 0) / Math.max(employees.length, 1))}
              </p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">Média Intervalo</p>
            </div>
            <div className="p-3 rounded-2xl bg-card border border-border">
              <AlertTriangle size={14} className="text-destructive mb-2" />
              <p className="text-2xl font-black text-destructive">
                {summaries.reduce((s, e) => s + e.absences, 0)}
              </p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">Total Faltas</p>
            </div>
          </div>
        )}

        {/* Employee List */}
        {!loading && summaries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold text-sm">Nenhum funcionário cadastrado</p>
          </div>
        )}

        {!loading && summaries.map((summary) => (
          <div key={summary.employee.id} className="bg-card border border-border rounded-2xl">
            {/* Employee Header */}
            <button
              onClick={() => setExpandedEmployee(expandedEmployee === summary.employee.id ? null : summary.employee.id)}
              className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <User size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-foreground truncate">{summary.employee.name}</p>
                {summary.employee.department && (
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                    {summary.employee.department}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-black text-foreground whitespace-nowrap">{formatDuration(summary.totalHours * 60)}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Trabalhadas</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-black text-foreground">{summary.daysWorked}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Dias</p>
                </div>
                {summary.absences > 0 && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 whitespace-nowrap">
                    {summary.absences} falta{summary.absences > 1 ? "s" : ""}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportEmployeePontoPDF(summary, currentMonth);
                  }}
                  className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                  title="Exportar PDF"
                >
                  <FileDown size={12} />
                </button>
                <ChevronRight
                  size={14}
                  className={`text-muted-foreground transition-transform ${expandedEmployee === summary.employee.id ? "rotate-90" : ""}`}
                />
              </div>
            </button>

            {/* Expanded Daily Detail */}
            {expandedEmployee === summary.employee.id && (
              <div className="border-t border-border">
                {/* Mobile summary */}
                <div className="grid grid-cols-3 gap-3 p-3 md:hidden border-b border-border">
                  <div className="text-center">
                    <p className="text-sm font-black text-foreground whitespace-nowrap">{formatDuration(summary.totalHours * 60)}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Horas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-foreground whitespace-nowrap">{formatDuration(summary.totalBreakMinutes)}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Intervalo</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-foreground">{summary.daysWorked}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Dias</p>
                  </div>
                </div>

                {/* Days table */}
                <div className="overflow-x-auto">
                  <table className="min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pl-4 pr-3 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest sticky left-0 bg-card z-10 min-w-[88px]">Dia</th>
                        <th className="text-center px-3 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                        <th className="text-center px-3 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Entrada</th>
                        <th className="text-center px-3 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Saída</th>
                        <th className="text-center px-3 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Horas</th>
                        <th className="text-center px-3 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Intervalo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.days.filter((d) => d.date <= new Date() || d.records.length > 0).map((day) => {
                        const dayNum = format(day.date, "dd");
                        const dayName = format(day.date, "EEE", { locale: ptBR });

                        return (
                          <tr
                            key={day.date.toISOString()}
                            className={`border-b border-border/50 ${
                              day.isWeekend ? "opacity-40" : day.isAbsent ? "bg-destructive/5" : ""
                            }`}
                          >
                            <td className="pl-4 pr-3 py-2 sticky left-0 bg-card z-10 min-w-[88px]">
                              <span className="font-black text-foreground">{dayNum}</span>
                              <span className="text-muted-foreground ml-1 text-xs capitalize">{dayName}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {day.isWeekend ? (
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">FDS</span>
                              ) : day.isAbsent ? (
                                <span className="inline-flex items-center gap-1 text-destructive text-[9px] font-black uppercase">
                                  <XCircle size={10} /> Faltou
                                </span>
                              ) : day.records.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-zinc-400 text-[9px] font-black uppercase">
                                  <CheckCircle2 size={10} /> OK
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-foreground tabular-nums whitespace-nowrap">
                              {day.clockIn || "—"}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-foreground tabular-nums whitespace-nowrap">
                              {day.clockOut || "—"}
                            </td>
                            <td className="px-3 py-2 text-center font-black text-foreground tabular-nums whitespace-nowrap">
                              {day.hoursWorked > 0 ? formatDuration(day.hoursWorked * 60) : "—"}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-zinc-400 tabular-nums whitespace-nowrap">
                              {day.breakMinutes > 0 ? formatDuration(day.breakMinutes) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/30">
                        <td className="pl-4 pr-3 py-2 font-black text-foreground text-[10px] uppercase sticky left-0 bg-card z-10 min-w-[88px]" colSpan={2}>
                          Total do Mês
                        </td>
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2 text-center font-black text-primary tabular-nums whitespace-nowrap">
                          {formatDuration(summary.totalHours * 60)}
                        </td>
                        <td className="px-3 py-2 text-center font-black text-zinc-400 tabular-nums whitespace-nowrap">
                          {formatDuration(summary.totalBreakMinutes)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
