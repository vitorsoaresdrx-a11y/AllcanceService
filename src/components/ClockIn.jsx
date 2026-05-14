import { useRef, useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/integrations/supabase/client";

const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const SIMILARITY_THRESHOLD = 0.5;
const AUTO_DETECT_INTERVAL = 1500; // ms entre tentativas automáticas

export default function ClockIn() {
  const videoRef = useRef(null);
  const autoDetectRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [labeledDescriptors, setLabeledDescriptors] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [lastRecord, setLastRecord] = useState(null);
  const [loadProgress, setLoadProgress] = useState("");
  const labeledRef = useRef(null);

  // Carrega modelos e descritores do banco
  useEffect(() => {
    const init = async () => {
      setStatus("loading");

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
          setStatus("error");
          setMessage("Nenhum funcionário cadastrado ainda.");
          return;
        }

        const labeled = data.map((row) => {
          const descriptor = new Float32Array(row.descriptor);
          return new faceapi.LabeledFaceDescriptors(
            JSON.stringify({ id: row.employee_id, name: row.employees.name }),
            [descriptor]
          );
        });

        setLabeledDescriptors(labeled);
        labeledRef.current = labeled;
        setModelsLoaded(true);
        setStatus("idle");
        setMessage("Sistema pronto! Abra a câmera para registrar.");
        setLoadProgress("");
      } catch (err) {
        setStatus("error");
        setMessage("Erro ao inicializar: " + (err.message || "tente novamente."));
        setLoadProgress("");
      }
    };

    init();
    return () => {
      if (autoDetectRef.current) clearInterval(autoDetectRef.current);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (autoDetectRef.current) {
      clearInterval(autoDetectRef.current);
      autoDetectRef.current = null;
    }
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const doRecognize = useCallback(async () => {
    if (!videoRef.current || !labeledRef.current) return false;

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return false;

    const matcher = new faceapi.FaceMatcher(labeledRef.current, SIMILARITY_THRESHOLD);
    const match = matcher.findBestMatch(detection.descriptor);

    if (match.label === "unknown") {
      setMessage("Rosto não reconhecido... Ajuste a posição.");
      return false;
    }

    const { id: employeeId, name } = JSON.parse(match.label);
    const confidence = parseFloat((1 - match.distance).toFixed(3));

    const today = new Date().toISOString().split("T")[0];
    const { data: lastEntry } = await supabase
      .from("time_records")
      .select("type")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    const type =
      !lastEntry || lastEntry.type === "clock_out" ? "clock_in" : "clock_out";

    const { error } = await supabase.from("time_records").insert({
      employee_id: employeeId,
      type,
      confidence,
    });

    if (error) {
      setMessage("Erro ao registrar ponto: " + error.message);
      return false;
    }

    const typeLabel = type === "clock_in" ? "Entrada" : "Saída";
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    stopCamera();
    setStatus("success");
    setLastRecord({ name, type: typeLabel, time, confidence });
    setMessage("");
    return true;
  }, [stopCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      setStatus("ready");
      setMessage("Detectando automaticamente... Olhe para a câmera.");
      setLastRecord(null);

      // Inicia detecção automática contínua
      if (autoDetectRef.current) clearInterval(autoDetectRef.current);
      autoDetectRef.current = setInterval(async () => {
        const found = await doRecognize();
        if (found && autoDetectRef.current) {
          clearInterval(autoDetectRef.current);
          autoDetectRef.current = null;
        }
      }, AUTO_DETECT_INTERVAL);
    } catch (err) {
      console.error("Camera error:", err);
      setStatus("error");
      setMessage("Não foi possível acessar a câmera.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Registro de Ponto</h2>

      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {status === "ready" && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-center">
            <span className="bg-primary/80 text-primary-foreground text-xs px-3 py-1 rounded-full animate-pulse">
              🔍 Detectando rosto...
            </span>
          </div>
        )}
        {status !== "ready" && status !== "recognizing" && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Câmera desligada
          </div>
        )}
      </div>

      {/* Loading progress */}
      {status === "loading" && loadProgress && (
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
          <p className="text-xs text-muted-foreground text-center">{loadProgress}</p>
        </div>
      )}

      {/* Resultado do reconhecimento */}
      {lastRecord && status === "success" && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-1">
          <p className="font-semibold text-emerald-400 text-lg">{lastRecord.name}</p>
          <p className="text-emerald-300">
            {lastRecord.type} registrada às {lastRecord.time}
          </p>
          <p className="text-emerald-500/60 text-xs">
            Confiança: {(lastRecord.confidence * 100).toFixed(1)}%
          </p>
        </div>
      )}

      {message && status !== "success" && (
        <p className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {message}
        </p>
      )}

      <div className="flex gap-2">
        {status !== "ready" && status !== "recognizing" ? (
          <button
            onClick={startCamera}
            disabled={!modelsLoaded || status === "loading"}
            className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 font-medium disabled:opacity-50 transition-colors"
          >
            {status === "loading" ? "Carregando modelos..." : status === "success" ? "Novo Registro" : "Abrir Câmera"}
          </button>
        ) : (
          <>
            <button
              onClick={doRecognize}
              disabled={status === "recognizing"}
              className="flex-1 bg-emerald-600 text-primary-foreground rounded-lg py-2.5 font-medium disabled:opacity-50"
            >
              Registrar Agora
            </button>
            <button
              onClick={() => { stopCamera(); setStatus("idle"); setMessage(""); }}
              className="px-4 border border-border rounded-lg py-2.5 text-foreground"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
