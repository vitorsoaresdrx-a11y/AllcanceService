import { useEffect, useRef, useState } from "react";
import { useInternalCalls, useMarkAsViewed, useSendReply } from "@/hooks/useInternalCalls";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Loader2, MessageSquare, Send } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export function CallsOverlay() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { data: pendingCalls = [], refetch } = useInternalCalls();
  const { mutateAsync: markAsViewed } = useMarkAsViewed();
  const { mutateAsync: sendReply, isPending: isSendingReply } = useSendReply();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const visibleCalls = pendingCalls.filter((c) => !dismissedIds.has(c.id));

  useEffect(() => {
    if (visibleCalls.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const playBeep = () => {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch {
        // ignore
      }
    };

    playBeep();
    intervalRef.current = setInterval(playBeep, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visibleCalls.length]);

  const handleMarkAsViewed = async (callId: string) => {
    if (loadingIds.has(callId)) return;
    setDismissedIds((prev) => new Set(prev).add(callId));
    setLoadingIds((prev) => new Set(prev).add(callId));

    try {
      await markAsViewed(callId);
      await refetch();
      if (replyingTo === callId) {
        setReplyingTo(null);
        setReplyText("");
      }
    } catch {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(callId);
        return next;
      });
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(callId);
        return next;
      });
    }
  };

  const handleSendReply = async (callId: string) => {
    if (!replyText.trim() || isSendingReply) return;
    try {
      await sendReply({ callId, message: replyText.trim() });
      setReplyText("");
      setReplyingTo(null);
      // Mark as viewed after replying
      await handleMarkAsViewed(callId);
    } catch {
      // keep overlay open
    }
  };

  if (visibleCalls.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-4 overflow-y-auto">
      <AnimatePresence>
        {visibleCalls.map((call, i) => (
          <motion.div
            key={call.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: i * 0.1 }}
            className="w-full max-w-sm bg-card border border-destructive/30 rounded-3xl p-6 shadow-[0_0_40px_hsl(var(--destructive)/0.15)]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center animate-pulse">
                <Bell size={20} className="text-destructive" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-destructive">Chamada</p>
                <p className="text-[10px] text-muted-foreground">
                  {call.created_by_name} · {format(new Date(call.created_at), "HH:mm")}
                </p>
              </div>
            </div>

            {/* Message */}
            {call.message && (
              <p className="text-base font-bold text-foreground leading-relaxed mb-4">
                {call.message}
              </p>
            )}

            {/* Audio */}
            {call.audio_url && (
              <AudioPlayer url={call.audio_url} duration={call.audio_duration} autoPlay />
            )}

            {/* Replies from others */}
            {(call as any).replies?.length > 0 && (
              <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
                {(call as any).replies.map((r: any) => (
                  <div key={r.id} className="bg-secondary/50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-primary">{r.created_by_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(r.created_at), "HH:mm")}
                      </span>
                    </div>
                    <p className="text-xs text-foreground">{r.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            {replyingTo === call.id ? (
              <div className="mb-4 space-y-2">
                <textarea
                  placeholder="Escreva sua resposta..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full h-20 bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none focus:border-primary transition-colors"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                    className="flex-1 h-9 rounded-xl bg-secondary text-muted-foreground text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleSendReply(call.id)}
                    disabled={!replyText.trim() || isSendingReply}
                    className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {isSendingReply ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Enviar
                  </button>
                </div>
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="flex gap-2">
              {call.created_by !== userId && replyingTo !== call.id && (
                <button
                  onClick={() => setReplyingTo(call.id)}
                  className="flex-1 h-11 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <MessageSquare size={14} />
                  Responder
                </button>
              )}
              <button
                onClick={() => handleMarkAsViewed(call.id)}
                disabled={loadingIds.has(call.id)}
                className="flex-1 h-11 rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-black transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loadingIds.has(call.id) ? <Loader2 size={16} className="animate-spin" /> : null}
                Marcar como visto
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
