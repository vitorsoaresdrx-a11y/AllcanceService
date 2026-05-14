import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";

interface AudioRecorderProps {
  onRecorded: (blob: Blob, duration: number) => void;
  onCleared?: () => void;
}

export function AudioRecorder({ onRecorded, onCleared }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const chunks = useRef<Blob[]>([]);
  const durationRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setRecorded(blob);
        onRecorded(blob, durationRef.current);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.current.start();
      setRecording(true);
      setDuration(0);
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      // permission denied or not available
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const clearRecording = () => {
    setRecorded(null);
    setDuration(0);
    setPlaying(false);
    onCleared?.();
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="bg-secondary border border-border rounded-2xl p-3 flex items-center gap-3">
      {!recorded ? (
        <>
          {recording ? (
            <>
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
              <span className="text-sm font-bold text-destructive flex-1">
                {formatTime(duration)}
              </span>
              <button
                onClick={stopRecording}
                className="w-9 h-9 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-all"
              >
                <Square size={14} fill="currentColor" />
              </button>
            </>
          ) : (
            <>
              <Mic size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground flex-1">Gravar áudio</span>
              <button
                onClick={startRecording}
                className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/20 transition-all"
              >
                <Mic size={16} />
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <audio
            ref={audioRef}
            src={URL.createObjectURL(recorded)}
            onEnded={() => setPlaying(false)}
          />
          <button
            onClick={() => {
              if (playing) {
                audioRef.current?.pause();
                setPlaying(false);
              } else {
                audioRef.current?.play();
                setPlaying(true);
              }
            }}
            className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <span className="text-sm text-muted-foreground flex-1">{formatTime(duration)}</span>
          <button
            onClick={clearRecording}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
}
