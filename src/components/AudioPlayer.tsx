import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  url: string;
  duration?: number | null;
  autoPlay?: boolean;
}

export function AudioPlayer({ url, duration, autoPlay = false }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const update = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const end = () => setPlaying(false);

    audio.addEventListener("timeupdate", update);
    audio.addEventListener("ended", end);

    if (autoPlay) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }

    return () => {
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("ended", end);
      audio.pause();
      audio.src = "";
    };
  }, [url, autoPlay]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2 mb-4">
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0"
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      {duration != null && (
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatTime(duration)}
        </span>
      )}
    </div>
  );
}
