import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock,
  Timer,
  Play,
  LogOut,
  Coffee,
  History,
  User,
  Activity,
  CalendarDays,
  ShieldCheck,
  Camera,
  X,
  Loader2,
  UtensilsCrossed,
  Check,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import * as faceapi from "face-api.js";

const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const SIMILARITY_THRESHOLD = 0.5;
const AUTO_DETECT_INTERVAL = 1200;

// --- UI Components ---

const PontoButton = ({ children, variant = "primary", size = "md", className = "", ...props }: any) => {
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_30px_rgba(161,161,170,0.3)]",
    secondary: "bg-card text-foreground hover:bg-card/80 border border-border",
    success: "bg-zinc-600 text-white hover:bg-zinc-500 shadow-[0_10px_30px_rgba(161,161,170,0.3)]",
  };
  const sizes: Record<string, string> = {
    sm: "h-10 px-4 text-[10px] font-black uppercase tracking-widest",
    md: "h-14 px-8 text-sm font-bold",
    lg: "h-20 px-10 rounded-[28px] text-lg font-black uppercase tracking-tighter",
  };
  return (
    <button className={`inline-flex items-center justify-center rounded-2xl transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const StatusBadge = ({ active }: { active: boolean }) => (
  <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${active ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'}`}>
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-zinc-500 animate-pulse' : 'bg-zinc-500'}`} />
    <span className="text-[10px] font-black uppercase tracking-widest">{active ? 'Jornada Ativa' : 'Fora de Expediente'}</span>
  </div>
);

const TYPE_LABELS: Record<string, string> = {
  clock_in: "Entrada",
  clock_out: "Saída",
  break_out: "Saída Intervalo",
  break_in: "Retorno Intervalo",
};

interface RecognizedPerson {
  id: string;
  name: string;
  confidence: number;
}

// --- Main Component ---

export default function PontoRegistro() {
  const [time, setTime] = useState(new Date());

  // Face recognition
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoDetectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const labeledRef = useRef<faceapi.LabeledFaceDescriptors[] | null>(null);
  const recognizedMapRef = useRef<Map<string, RecognizedPerson>>(new Map());
  const pendingStreamRef = useRef<MediaStream | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  // Action mode: what happens when user clicks "Pronto"
  const [actionMode, setActionMode] = useState<"clock_in" | "clock_out" | "break_out" | "break_in" | null>(null);

  // Recognized people (displayed in UI while camera is open)
  const [recognizedList, setRecognizedList] = useState<RecognizedPerson[]>([]);

  // General state
  const [logs, setLogs] = useState<Array<{ type: string; time: string; date: string; name: string }>>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [todayHours, setTodayHours] = useState("00h 00m");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastBatchResult, setLastBatchResult] = useState<{ count: number; type: string } | null>(null);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load models + descriptors
  useEffect(() => {
    const init = async () => {
      try {
        setLoadProgress("Carregando detector de rosto...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        setLoadProgress("Carregando pontos faciais...");
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
        setLoadProgress("Carregando reconhecimento...");
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);

        setLoadProgress("Carregando funcionários...");
        const { data, error } = await supabase
          .from("face_embeddings")
          .select("employee_id, descriptor, employees(name)");

        if (error) throw error;
        if (!data || data.length === 0) {
          setMessage("Nenhum funcionário cadastrado ainda.");
          setLoadProgress("");
          return;
        }

        const labeled = data.map((row: any) => {
          const descriptor = new Float32Array(row.descriptor);
          return new faceapi.LabeledFaceDescriptors(
            JSON.stringify({ id: row.employee_id, name: row.employees.name }),
            [descriptor]
          );
        });

        labeledRef.current = labeled;
        setModelsLoaded(true);
        setLoadProgress("");
      } catch (err: any) {
        setMessage("Erro ao inicializar: " + (err.message || "tente novamente."));
        setLoadProgress("");
      }
    };
    init();
    return () => {
      if (autoDetectRef.current) clearInterval(autoDetectRef.current);
    };
  }, []);

  // Load today's records
  const loadTodayRecords = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("time_records")
      .select("type, timestamp, confidence, employee_id, employees(name)")
      .eq("date", today)
      .order("timestamp", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      setLogs(data.map((r: any) => ({
        type: TYPE_LABELS[r.type] || r.type,
        time: new Date(r.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        date: "Hoje",
        name: r.employees?.name || "—",
      })));

      // Check if any employee is currently working
      // Group by employee, check last record
      const byEmployee = new Map<string, string>();
      for (const r of data) {
        if (!byEmployee.has(r.employee_id)) {
          byEmployee.set(r.employee_id, r.type);
        }
      }
      const anyWorking = [...byEmployee.values()].some(t => t === "clock_in" || t === "break_in");
      setIsWorking(anyWorking);

      calculateHours(data);
    } else {
      setLogs([]);
      setIsWorking(false);
      setTodayHours("00h 00m");
    }
  }, []);

  useEffect(() => {
    loadTodayRecords();
  }, [loadTodayRecords]);

  const calculateHours = (records: any[]) => {
    // Group by employee, calculate per-employee, sum total
    const byEmployee = new Map<string, any[]>();
    for (const r of records) {
      if (!byEmployee.has(r.employee_id)) byEmployee.set(r.employee_id, []);
      byEmployee.get(r.employee_id)!.push(r);
    }

    let totalMs = 0;
    for (const empRecords of byEmployee.values()) {
      const sorted = [...empRecords].reverse();
      let lastIn: Date | null = null;
      for (const r of sorted) {
        if (r.type === "clock_in" || r.type === "break_in") {
          lastIn = new Date(r.timestamp);
        } else if ((r.type === "clock_out" || r.type === "break_out") && lastIn) {
          totalMs += new Date(r.timestamp).getTime() - lastIn.getTime();
          lastIn = null;
        }
      }
      if (lastIn) totalMs += Date.now() - lastIn.getTime();
    }

    const hours = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    setTodayHours(`${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`);
  };

  // Camera controls
  const stopCamera = useCallback(() => {
    if (autoDetectRef.current) {
      clearInterval(autoDetectRef.current);
      autoDetectRef.current = null;
    }

    const attachedStream = videoRef.current?.srcObject as MediaStream | null;
    attachedStream?.getTracks().forEach((t) => t.stop());

    if (pendingStreamRef.current && pendingStreamRef.current !== attachedStream) {
      pendingStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    pendingStreamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  // Continuous multi-face detection
  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !labeledRef.current) return;

    try {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) return;

      const matcher = new faceapi.FaceMatcher(labeledRef.current, SIMILARITY_THRESHOLD);

      for (const detection of detections) {
        const match = matcher.findBestMatch(detection.descriptor);
        if (match.label === "unknown") continue;

        const { id, name } = JSON.parse(match.label);
        const confidence = parseFloat((1 - match.distance).toFixed(3));

        // Only update if better confidence or new person
        const existing = recognizedMapRef.current.get(id);
        if (!existing || confidence > existing.confidence) {
          recognizedMapRef.current.set(id, { id, name, confidence });
          setRecognizedList([...recognizedMapRef.current.values()]);
        }
      }
    } catch {
      // Silently ignore detection errors during continuous scanning
    }
  }, []);

  const startCamera = async (mode: "clock_in" | "clock_out" | "break_out" | "break_in") => {
    setActionMode(mode);
    setLastBatchResult(null);
    setMessage("");
    recognizedMapRef.current.clear();
    setRecognizedList([]);

    try {
      // getUserMedia precisa ser acionado diretamente pelo clique
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });

      pendingStreamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      console.error("Falha ao abrir câmera no PontoRegistro:", err);
      setMessage("Não foi possível acessar a câmera.");
    }
  };

  // Anexa stream somente depois que o <video> existir no DOM
  useEffect(() => {
    if (!cameraOpen) return;

    const video = videoRef.current;
    const stream = pendingStreamRef.current;
    if (!video || !stream) return;

    let cancelled = false;

    const attachAndStart = async () => {
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // Ignora: alguns navegadores já reproduzem via autoPlay
      }

      if (cancelled) return;

      if (autoDetectRef.current) clearInterval(autoDetectRef.current);
      autoDetectRef.current = setInterval(detectFaces, AUTO_DETECT_INTERVAL);
    };

    attachAndStart();

    return () => {
      cancelled = true;
    };
  }, [cameraOpen, detectFaces]);

  // "Pronto" button — register all recognized people
  const handleConfirm = async () => {
    if (!actionMode || recognizedMapRef.current.size === 0) {
      setMessage("Nenhum rosto reconhecido ainda. Posicione os funcionários na câmera.");
      return;
    }

    setSaving(true);
    stopCamera();

    const people = [...recognizedMapRef.current.values()];
    let successCount = 0;

    for (const person of people) {
      const { error } = await supabase.from("time_records").insert({
        employee_id: person.id,
        type: actionMode,
        confidence: person.confidence,
      });
      if (!error) successCount++;
    }

    const typeLabel = TYPE_LABELS[actionMode] || actionMode;
    setLastBatchResult({ count: successCount, type: typeLabel });
    setActionMode(null);
    recognizedMapRef.current.clear();
    setRecognizedList([]);
    setSaving(false);
    await loadTodayRecords();
  };

  const handleCancel = () => {
    stopCamera();
    setActionMode(null);
    recognizedMapRef.current.clear();
    setRecognizedList([]);
    setMessage("");
  };

  return (
    <div className="min-h-full bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:pb-0">
      <div className="max-w-4xl mx-auto p-4 md:p-12 space-y-6 md:space-y-12">

        {/* Header */}
        <header className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center shrink-0">
              <Users size={18} className="text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-base font-black text-foreground tracking-tight uppercase leading-none">
                Registro de Ponto
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Reconhecimento Facial
              </p>
            </div>
          </div>
          <StatusBadge active={isWorking} />
        </header>

        {/* Loading progress */}
        {loadProgress && (
          <div className="space-y-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">{loadProgress}</p>
          </div>
        )}

        {/* Camera + Recognition Panel */}
        {cameraOpen && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-border">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 right-3 flex justify-center">
                <span className="bg-primary/80 text-primary-foreground text-xs px-3 py-1.5 rounded-full animate-pulse flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Detectando... {recognizedList.length > 0 && `(${recognizedList.length})`}
                </span>
              </div>
              <div className="absolute top-3 left-3">
                <span className="bg-card/80 backdrop-blur text-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-border">
                  {TYPE_LABELS[actionMode || ""] || actionMode}
                </span>
              </div>
            </div>

            {/* Recognized people list */}
            {recognizedList.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                  Funcionários Detectados ({recognizedList.length})
                </p>
                <div className="space-y-1">
                  {recognizedList.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-zinc-500/5 border border-zinc-500/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-500/10 flex items-center justify-center">
                          <User size={16} className="text-zinc-400" />
                        </div>
                        <span className="text-sm font-bold text-foreground">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400">
                        {(p.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Camera action buttons */}
            <div className="flex gap-2">
              <button
                className="flex-1 h-11 rounded-2xl bg-zinc-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                onClick={handleConfirm}
                disabled={recognizedList.length === 0 || saving}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? "Registrando..." : `Pronto (${recognizedList.length})`}
              </button>
              <button
                className="px-4 h-11 border border-border rounded-2xl text-foreground font-bold text-sm hover:bg-muted transition-colors"
                onClick={handleCancel}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Batch result */}
        {lastBatchResult && !cameraOpen && (
          <div className="bg-zinc-500/10 border border-zinc-500/30 rounded-2xl p-4 space-y-1">
            <p className="font-black text-zinc-400 text-sm">
              {lastBatchResult.type} Registrada
            </p>
            <p className="text-zinc-300 font-bold text-xs">
              {lastBatchResult.count} funcionário{lastBatchResult.count !== 1 ? "s" : ""} registrado{lastBatchResult.count !== 1 ? "s" : ""} às{" "}
              {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}

        {/* Message */}
        {message && !cameraOpen && (
          <p className="text-xs text-muted-foreground text-center">{message}</p>
        )}

        {/* Cockpit Central */}
        {!cameraOpen && (
          <div className="bg-card border border-border rounded-2xl p-5 md:p-16 text-center">
            <div className="flex flex-col items-center space-y-6">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Horário Local Atualizado</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl md:text-8xl font-black text-foreground tracking-tighter tabular-nums leading-none">
                    {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-lg md:text-2xl font-bold text-primary opacity-50">
                    {time.toLocaleTimeString('pt-BR', { second: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground capitalize flex items-center justify-center gap-1.5">
                  <CalendarDays size={11} className="text-primary" />
                  {format(time, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>

              <div className="flex flex-col w-full max-w-sm gap-2">
                <button
                  onClick={() => startCamera(isWorking ? "clock_out" : "clock_in")}
                  disabled={!modelsLoaded || !!loadProgress}
                  className={`w-full h-11 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap ${
                    isWorking
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {!modelsLoaded && loadProgress ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Carregando...
                    </>
                  ) : isWorking ? (
                    <>
                      <LogOut size={16} /> Encerrar Turno
                    </>
                  ) : (
                    <>
                      <Play size={16} fill="currentColor" /> Bater Ponto
                    </>
                  )}
                </button>

                <button
                  onClick={() => startCamera(isWorking ? "break_out" : "break_in")}
                  disabled={!modelsLoaded || !!loadProgress}
                  className="w-full h-10 rounded-2xl bg-card border border-border text-muted-foreground text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                >
                  <Coffee size={15} className="text-zinc-500" /> Intervalo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats + History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* Today's Metrics */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
              <Timer size={11} /> Métricas de Hoje
            </p>
            <div className="p-3 rounded-2xl bg-card border border-border">
              <p className="text-[9px] uppercase text-muted-foreground mb-1">Total Trabalhado</p>
              <p className="text-2xl font-black text-foreground tracking-tighter">{todayHours}</p>
            </div>
          </div>

          {/* Recent History */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
              <History size={11} /> Batidas Recentes
            </p>
            <div className="space-y-2">
              {logs.length === 0 && (
                <p className="text-muted-foreground text-xs text-center py-6">Nenhum registro hoje</p>
              )}
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    log.type.includes('Entrada') || log.type.includes('Retorno')
                      ? 'bg-zinc-500/10'
                      : log.type.includes('Intervalo') ? 'bg-zinc-500/10' : 'bg-primary/10'
                  }`}>
                    {log.type.includes('Intervalo') ? <UtensilsCrossed size={14} className="text-zinc-400" /> :
                     log.type.includes('Entrada') || log.type.includes('Retorno') ? <Activity size={14} className="text-zinc-400" /> : <LogOut size={14} className="text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{log.type}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{log.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-foreground tabular-nums">{log.time}</p>
                    <p className="text-[9px] text-muted-foreground flex items-center gap-1 justify-end">
                      <ShieldCheck size={9} /> Verificado
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-1.5 py-6 opacity-30">
        <ShieldCheck size={10} className="text-muted-foreground shrink-0" />
        <p className="text-[7px] uppercase tracking-wider text-muted-foreground">
          Allcance Security · 2026
        </p>
      </footer>
    </div>
  );
}
