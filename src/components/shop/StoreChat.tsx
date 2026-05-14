import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  X, 
  Send, 
  Bike, 
  Bot,
  Loader2,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface StoreChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StoreChat({ isOpen, onClose }: StoreChatProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: async ({ message, history }: { message: string, history: ChatMessage[] }) => {
      const { data, error } = await supabase.functions.invoke("store-ai-chat", {
        body: { message, history: history.slice(-5) }
      });
      if (error) throw error;
      return data.response as string;
    },
    onSuccess: (response) => {
      setHistory((prev) => [...prev, { role: "assistant", content: response }]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || mutation.isPending) return;
    const userMsg = input.trim();
    setHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    mutation.mutate({ message: userMsg, history });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const formatMessage = (content: string) => {
    const urlRegex = /((https?:\/\/[^\s]+)|(bit\.ly\/[^\s]+))/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.match(urlRegex)) {
        const href = part.startsWith("http") ? part : `https://${part}`;
        return (
          <a 
            key={i} 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-[#A1A1AA]/20 px-2 py-1 rounded-md underline decoration-[#A1A1AA]/30 hover:decoration-[#A1A1AA] transition-all font-bold"
          >
            Acessar link <ExternalLink size={10} />
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="w-full max-w-lg h-[80vh] sm:h-[650px] bg-black border-t sm:border border-white/10 sm:rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col z-[110]"
          >
            {/* Header */}
            <header className="bg-[#0A0A0A] p-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-center text-[#A1A1AA]">
                  <Bot size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Assistente Virtual</h3>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 shadow-[0_0_8px_rgba(161,161,170,0.5)]" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Disponível agora</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={18} />
              </button>
            </header>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#050505] scrollbar-hide">
              {history.length === 0 && (
                <div className="py-16 text-center space-y-6">
                  <div className="w-16 h-16 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <Bike size={32} strokeWidth={1.5} className="text-white/20" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A1A1AA]">Allcance Suporte</p>
                    <p className="text-xs font-medium max-w-[280px] mx-auto leading-relaxed text-white/40">
                      Olá. Estou à disposição para auxiliar com dúvidas técnicas, especificações de produtos ou status do seu pedido. Como posso ajudar?
                    </p>
                  </div>
                </div>
              )}
              
              {history.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-[20px] px-5 py-3.5 text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user" 
                      ? "bg-[#A1A1AA] text-black rounded-br-none font-bold" 
                      : "bg-white/[0.03] border border-white/10 text-white/90 rounded-bl-none"
                  }`}>
                    {msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
                  </div>
                </motion.div>
              ))}
              
              {mutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[#A1A1AA]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-white/5 bg-black">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Descreva sua dúvida detalhadamente..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-[18px] pl-5 pr-14 text-sm font-medium focus:outline-none focus:border-[#A1A1AA]/30 placeholder:text-white/10 transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || mutation.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[#A1A1AA] flex items-center justify-center text-black disabled:opacity-20 transition-all hover:bg-white active:scale-95"
                >
                  <Send size={18} strokeWidth={2.5} />
                </button>
              </div>
              <p className="text-[9px] text-center text-white/10 mt-6 font-bold uppercase tracking-[0.4em]">
                Sistemas Automatizados Allcance
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
