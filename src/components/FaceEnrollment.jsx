import { useRef, useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/integrations/supabase/client";
import {
  UserPlus,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  Mail,
  Building2,
  User,
  ShieldCheck,
} from "lucide-react";
import EmployeeList from "./EmployeeList";

const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

export default function FaceEnrollment() {
  const videoRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [loadProgress, setLoadProgress] = useState("");
  const [form, setForm] = useState({ name: "", email: "", department: "" });
  const [listRefreshKey, setListRefreshKey] = useState(0);

  useEffect(() => {
    const loadModels = async () => {
      setStatus("loading");
      try {
        setLoadProgress("Carregando detector de rosto...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        setLoadProgress("Carregando pontos faciais...");
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
        setLoadProgress("Carregando reconhecimento...");
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
        setModelsLoaded(true);
        setStatus("idle");
        setLoadProgress("");
        setMessage("");
      } catch {
        setStatus("error");
        setMessage("Erro ao carregar modelos. Verifique sua conexão.");
        setLoadProgress("");
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      videoRef.current.srcObject = stream;
      setStatus("capturing");
      setMessage("Posicione o rosto no centro e clique em Capturar.");
    } catch {
      setStatus("error");
      setMessage("Não foi possível acessar a câmera.");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const capture = async () => {
    if (!form.name) {
      setMessage("Preencha o nome antes de capturar.");
      return;
    }

    const emailToUse = form.email || `${form.name.toLowerCase().replace(/\s+/g, ".")}@ponto.local`;

    setStatus("saving");
    setMessage("Detectando rosto...");

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setStatus("capturing");
        setMessage("Rosto não detectado. Tente novamente com boa iluminação.");
        return;
      }

      const descriptor = Array.from(detection.descriptor);

      const { data: employee, error: empError } = await supabase
        .from("employees")
        .upsert(
          { name: form.name, email: emailToUse, department: form.department, active: true },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (empError) throw empError;

      await supabase.from("face_embeddings").delete().eq("employee_id", employee.id);

      const { error: faceError } = await supabase
        .from("face_embeddings")
        .insert({ employee_id: employee.id, descriptor });

      if (faceError) throw faceError;

      stopCamera();
      setStatus("success");
      setMessage(`Funcionário ${form.name} cadastrado com sucesso!`);
      setForm({ name: "", email: "", department: "" });
      setListRefreshKey((k) => k + 1);
    } catch (err) {
      setStatus("error");
      setMessage("Erro ao capturar/salvar: " + (err?.message || "tente novamente."));
    }
  };

  const handleReRegister = useCallback((empData) => {
    setForm({ name: empData.name, email: empData.email, department: empData.department });
    setStatus("idle");
    setMessage("Preencha os dados e abra a câmera para recadastrar o rosto.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const isCameraActive = status === "capturing" || status === "saving";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-4xl mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center shrink-0">
            <UserPlus size={18} className="text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-tight text-foreground">Cadastro Facial</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Registro de novo funcionário</p>
          </div>
        </div>

        {/* Loading progress */}
        {loadProgress && (
          <div className="space-y-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">{loadProgress}</p>
          </div>
        )}

        {/* Success message */}
        {status === "success" && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-emerald-400 text-sm">Cadastro Concluído</p>
              <p className="text-emerald-300 font-bold text-xs">{message}</p>
            </div>
          </div>
        )}

        {/* Form + Camera Card */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <User size={10} /> Nome Completo *
              </label>
              <input
                className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] transition-all font-bold"
                placeholder="Ex: João da Silva"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Mail size={10} /> E-mail
              </label>
              <input
                className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] transition-all font-bold"
                placeholder="Opcional"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Building2 size={10} /> Departamento
              </label>
              <input
                className="w-full bg-background border border-border rounded-xl h-10 px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] transition-all font-bold"
                placeholder="Opcional"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
          </div>

          {/* Camera */}
          <div className="relative bg-black rounded-2xl overflow-hidden border border-border">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full object-cover ${isCameraActive ? "aspect-[4/3]" : "hidden"}`}
            />
            {isCameraActive && status === "saving" && (
              <div className="absolute bottom-3 left-3 right-3 flex justify-center">
                <span className="bg-primary/80 text-primary-foreground text-xs px-3 py-1.5 rounded-full animate-pulse flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Detectando...
                </span>
              </div>
            )}
            {isCameraActive && status === "capturing" && (
              <div className="absolute bottom-3 left-3 right-3 flex justify-center">
                <span className="bg-emerald-500/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                  <ShieldCheck size={14} /> Câmera pronta
                </span>
              </div>
            )}
            {!isCameraActive && (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Camera size={24} className="opacity-30" />
                <span className="text-[10px] font-bold opacity-50">Câmera desligada</span>
              </div>
            )}
            {isCameraActive && (
              <button
                onClick={() => { stopCamera(); setStatus("idle"); setMessage(""); }}
                className="absolute top-2 right-2 bg-card/80 backdrop-blur p-1.5 rounded-full border border-border hover:bg-destructive/20 transition-colors"
              >
                <X size={14} className="text-foreground" />
              </button>
            )}
          </div>

          {/* Message */}
          {message && status !== "success" && (
            <p className={`text-xs text-center font-bold ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
              {message}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                disabled={!modelsLoaded || status === "loading"}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl h-10 text-sm font-bold whitespace-nowrap shadow-[0_6px_20px_hsl(var(--primary)/0.3)] transition-all active:scale-95 disabled:opacity-50"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Carregando...
                  </>
                ) : (
                  <>
                    <Camera size={16} /> Abrir Câmera
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={capture}
                  disabled={status === "saving"}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl h-10 text-sm font-bold whitespace-nowrap shadow-[0_6px_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50"
                >
                  {status === "saving" ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Capturar
                    </>
                  )}
                </button>
                <button
                  onClick={() => { stopCamera(); setStatus("idle"); setMessage(""); }}
                  className="px-4 border border-border rounded-xl h-10 text-foreground font-bold text-sm hover:bg-muted transition-colors whitespace-nowrap"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <EmployeeList refreshKey={listRefreshKey} onReRegister={handleReRegister} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 mt-2 pb-4">
          <ShieldCheck size={10} className="text-muted-foreground/40 shrink-0" />
          <p className="text-[7px] uppercase tracking-wider text-muted-foreground/40 text-center">
            Allcance Security · 2026
          </p>
        </div>
      </div>
    </div>
  );
}
