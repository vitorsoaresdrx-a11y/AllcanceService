import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useUpdateConversationStatus,
  useMarkAsRead,
  useToggleAi,
  useLabels,
  useCreateLabel,
  useDeleteLabel,
  useUpdateLabel,
  useAssignLabel,
  useUnassignLabel,
  type Conversation,
  type Label
} from "@/hooks/useWhatsApp";
import {
  useEvolutionInstances,
  useSelectedInstance,
  useInstanceStatus,
} from "@/hooks/useZapiStatus";
import {
  useInstanceAi,
  useToggleInstanceAi,
} from "@/hooks/useInstanceAi";
import {
  MessageCircle,
  Send,
  Volume2,
  Search,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  CircleDot,
  MoreVertical,
  Hash,
  Paperclip,
  Smile,
  Loader2,
  Wifi,
  WifiOff,
  Bot,
  BotOff,
  Radio,
  Server,
  User,
  Mic,
  Tag,
  Plus,
  Info,
  ArrowRight,
  Trash2,
  X,
  PlusCircle,
  Palette,
  ChevronUp,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getOptimizedImageUrl } from "@/lib/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null, phone?: string) {
  if (name) return name.slice(0, 2).toUpperCase();
  return (phone || "?").slice(-2);
}

function getDisplayContactPhone(phone?: string | null) {
  const rawPhone = (phone || "").trim();
  if (!rawPhone || rawPhone.includes("status@broadcast") || rawPhone.includes("@lid")) {
    return "Desconhecido";
  }
  return rawPhone.replace(/\D/g, "");
}

function getDisplayContactName(conversation: Conversation, currentUserName?: string | null) {
  const candidate = (conversation.contact_name || "").trim();
  const normalizedCurrentUserName = (currentUserName || "").trim().toLowerCase();
  if (candidate && (!normalizedCurrentUserName || candidate.toLowerCase() !== normalizedCurrentUserName)) {
    return candidate;
  }
  return getDisplayContactPhone(conversation.contact_phone);
}

function formatSummary(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/\*/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("<br/>");
}

// ─── Status Configs ───────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "Todos", value: "all" },
  { label: "Abertas", value: "open" },
  { label: "Aguardando", value: "waiting" },
  { label: "Finalizadas", value: "resolved" },
];

const statusBadgeConfig: Record<string, string> = {
  open: "bg-[#A1A1AA]/10 text-[#A1A1AA] border-[#A1A1AA]/20",
  waiting: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  resolved: "bg-white/5 text-white/40 border-white/5",
};

const statusLabel: Record<string, string> = {
  open: "ABERTO",
  waiting: "AGUARDANDO",
  resolved: "FINALIZADO",
};

// ─── UI Components ───────────────────────────────────────────────────────────

function MessageStatus({ status }: { status: string }) {
  if (status === "read") return <CheckCheck className="h-3 w-3 text-zinc-400" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-white/40" />;
  if (status === "sent") return <Check className="h-3 w-3 text-white/40" />;
  return <Clock className="h-3 w-3 text-white/20" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WhatsApp() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendAsAudio, setSendAsAudio] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: instances = [], isLoading: instancesLoading } = useEvolutionInstances();
  const { selected: selectedInstance, setSelected: setSelectedInstance } = useSelectedInstance();
  const { data: instanceStatus } = useInstanceStatus(selectedInstance);
  const isConnected = instanceStatus?.connected === true;

  const { data: instanceAiData } = useInstanceAi(selectedInstance);
  const toggleInstanceAi = useToggleInstanceAi();
  const isInstanceAiEnabled = instanceAiData?.ai_enabled !== false;

  useEffect(() => {
    if (!selectedInstance && instances.length > 0) {
      const connected = instances.find((i) => i.connected);
      setSelectedInstance(connected?.instanceName || instances[0].instanceName);
    }
  }, [instances, selectedInstance, setSelectedInstance]);

  const { data: conversations = [] } = useConversations(statusFilter, selectedInstance);
  const activeConv = conversations.find(c => c.id === selectedConv?.id) || selectedConv;
  const { data: messages = [] } = useMessages(selectedConv?.id || null);
  const sendMessage = useSendMessage();
  const updateStatus = useUpdateConversationStatus();
  const markAsRead = useMarkAsRead();
  const toggleAi = useToggleAi();
  
  const { data: allLabels = [] } = useLabels();
  const createLabel = useCreateLabel();
  const deleteLabel = useDeleteLabel();
  const updateLabel = useUpdateLabel();
  const assignLabel = useAssignLabel();
  const unassignLabel = useUnassignLabel();

  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#A1A1AA");
  const [newLabelPriority, setNewLabelPriority] = useState(1);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [filterLabelId, setFilterLabelId] = useState<string | null>(null);

  const { session } = useAuth();
  const currentUserName = session?.user?.user_metadata?.full_name || null;

  const debouncedSearch = useDebounce(search, 300);
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return conversations.filter((c) => {
      const displayName = getDisplayContactName(c, currentUserName).toLowerCase();
      const displayPhone = getDisplayContactPhone(c.contact_phone).toLowerCase();
      return displayName.includes(q) || displayPhone.includes(q);
    });
  }, [conversations, debouncedSearch, currentUserName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedConv && selectedConv.unread_count > 0) {
      markAsRead.mutate(selectedConv.id);
    }
  }, [selectedConv?.id]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedConv) return;
    sendMessage.mutate(
      {
        phone: selectedConv.contact_phone,
        message: messageText.trim(),
        conversationId: selectedConv.id,
        sendAsAudio,
        instanceName: selectedInstance || undefined,
      },
      {
        onSuccess: () => setMessageText(""),
        onError: () => toast({ title: "Falha ao enviar", variant: "destructive" }),
      }
    );
  };

  const [showChatMobile, setShowChatMobile] = useState(false);

  if (instancesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-6">
        <Loader2 size={40} className="text-[#A1A1AA] animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Carregando...</p>
      </div>
    );
  }

  if (!selectedInstance || instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[99] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
        <div className="flex flex-col items-center gap-10 max-w-md w-full relative z-10">
          <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[40px] flex items-center justify-center text-white/20 shadow-2xl">
            <Server size={44} strokeWidth={1.5} />
          </div>
          <div className="text-center space-y-4">
             <h1 className="text-3xl font-black italic uppercase tracking-tighter">Hub WhatsApp</h1>
             <p className="text-[13px] text-white/40 leading-relaxed text-center">Selecione uma instância para começar a gerenciar suas conversas.</p>
          </div>
          <div className="w-full space-y-3">
             {instances.map(inst => (
               <button 
                 key={inst.instanceName}
                 onClick={() => setSelectedInstance(inst.instanceName)}
                 className="w-full p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all flex items-center justify-between group"
               >
                 <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${inst.connected ? "bg-zinc-500/10 text-zinc-500" : "bg-zinc-500/10 text-zinc-500"}`}>
                       {inst.connected ? <Wifi size={24} /> : <WifiOff size={24} />}
                    </div>
                    <div className="text-left">
                       <p className="text-[15px] font-black italic text-white uppercase tracking-tight">{inst.instanceName}</p>
                       <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${inst.connected ? "text-zinc-400" : "text-zinc-400"}`}>
                         {inst.connected ? "CONECTADO" : "DESCONECTADO"}
                       </p>
                    </div>
                 </div>
                 <ArrowRight size={20} className="text-white/10 group-hover:text-white transition-all transform group-hover:translate-x-1" />
               </button>
             ))}
          </div>
          <button 
            onClick={() => navigate('/')}
            className="mt-6 px-10 h-14 border border-white/5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
          >
            VOLTAR AO SISTEMA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-[#050505] text-white font-['Plus_Jakarta_Sans'] overflow-hidden relative selection:bg-[#A1A1AA] selection:text-black">
      
      {/* NOISE OVERLAY */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[99] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />

      {/* ── SIDEBAR: CONTACTS ── */}
      <aside className={`w-full md:w-[400px] flex flex-col border-r border-white/5 bg-[#0A0A0A] z-10 ${showChatMobile ? "hidden md:flex" : "flex"}`}>
        
        {/* Header com Botão Voltar */}
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl transition-all group"
            >
              <ChevronLeft size={16} className="text-white/40 group-hover:text-white transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">VOLTAR</span>
            </button>
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-zinc-500 shadow-[0_0_10px_#A1A1AA]" : "bg-zinc-500"}`} />
              <Radio size={16} className="text-white/20" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">MENSAGENS</h1>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl group">
             <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-zinc-500 shadow-[0_0_8px_#A1A1AA]" : "bg-zinc-500"} animate-pulse`} />
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white/60">Instância Conectada</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white/40 uppercase">IA ATIVA</span>
                <button 
                  onClick={() => {
                    if (selectedInstance) {
                      toggleInstanceAi.mutate({ instanceName: selectedInstance, ai_enabled: !isInstanceAiEnabled });
                    }
                  }}
                  className={`w-10 h-5 rounded-full relative transition-all ${isInstanceAiEnabled ? "bg-zinc-500" : "bg-white/10"}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isInstanceAiEnabled ? "right-1" : "left-1"}`} />
                </button>
             </div>
          </div>

          {/* Search */}
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#A1A1AA] transition-colors" />
            <input 
              placeholder="Buscar contato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-2xl pl-12 pr-4 text-[14px] font-medium outline-none focus:border-[#A1A1AA]/30 transition-all placeholder:text-white/10"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {STATUS_FILTERS.map(f => (
              <button 
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${statusFilter === f.value ? "bg-[#27272A] border-[#27272A] text-white shadow-lg" : "bg-white/5 border-white/5 text-white/30 hover:text-white"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-10 scrollbar-none">
          {filtered.map(conv => (
            <button 
              key={conv.id}
              onClick={() => { setSelectedConv(conv); setShowChatMobile(true); }}
              className={`w-full p-6 lg:p-7 rounded-[32px] border transition-all flex items-center gap-5 group ${selectedConv?.id === conv.id ? "bg-white/5 border-white/10 shadow-2xl" : "bg-transparent border-transparent hover:bg-white/[0.02]"}`}
            >
              <div className="relative shrink-0">
                <div className="w-16 h-16 bg-white/5 rounded-[22px] flex items-center justify-center text-white/20 border border-white/5 overflow-hidden group-hover:border-[#A1A1AA]/30 transition-all">
                  {conv.contact_photo ? (
                    <img src={getOptimizedImageUrl(conv.contact_photo, 100, 80)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-xl font-black italic">{getInitials(getDisplayContactName(conv, currentUserName), conv.contact_phone)}</span>
                  )}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#0A0A0A] ${conv.status === 'open' ? 'bg-zinc-500' : conv.status === 'waiting' ? 'bg-zinc-500' : 'bg-white/20'}`} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[15px] font-black italic uppercase tracking-tighter truncate leading-none">{getDisplayContactName(conv, currentUserName)}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-white/20 uppercase">{format(new Date(conv.last_message_at), "HH:mm")}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/20 hover:text-white">
                          <MoreVertical size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-[#0F0F0F] border-white/5 p-2 rounded-2xl">
                         <p className="text-[9px] font-black text-white/40 uppercase tracking-widest p-2 mb-1">Etiquetar Contato</p>
                         {allLabels.length === 0 && <p className="text-[10px] text-white/20 p-2 italic">Nenhuma etiqueta criada.</p>}
                         {allLabels.map(label => {
                           const isAssigned = conv.labels?.some(l => l.id === label.id);
                           return (
                             <DropdownMenuItem 
                               key={label.id}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (isAssigned) {
                                   unassignLabel.mutate({ conversationId: conv.id, labelId: label.id });
                                 } else {
                                   assignLabel.mutate({ conversationId: conv.id, labelId: label.id });
                                 }
                               }}
                               className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer group"
                             >
                                <div className={`w-3 h-3 rounded-full border-2 ${isAssigned ? "bg-white border-white scale-110" : "border-white/10"}`} style={{ backgroundColor: isAssigned ? label.color : 'transparent', borderColor: isAssigned ? 'transparent' : 'rgba(255,255,255,0.1)' }} />
                                <span className={cn("text-[11px] font-bold uppercase tracking-tight", isAssigned ? "text-white" : "text-white/40")}>{label.name}</span>
                             </DropdownMenuItem>
                           );
                         })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-[12px] font-medium text-white/30 truncate leading-none mb-2">{conv.last_message}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden max-w-[180px]">
                     <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0 ${statusBadgeConfig[conv.status] || "bg-white/5 text-white/40"}`}>{statusLabel[conv.status]}</span>
                     {conv.labels?.map(l => (
                       <span key={l.id} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} title={l.name} />
                     ))}
                  </div>
                  {conv.unread_count > 0 && <span className="bg-[#A1A1AA] text-black text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">NOVAS</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── CHAT AREA ── */}
      <main className={`flex-1 flex flex-col bg-[#050505] relative z-10 ${showChatMobile ? "fixed inset-0" : "hidden md:flex"}`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center text-white/5 mb-8 border border-white/5 shadow-inner">
               <MessageCircle size={48} strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white/20">Selecione uma conversa</h3>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <header className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-3xl shrink-0">
               <div className="flex items-center gap-5">
                  <button onClick={() => setShowChatMobile(false)} className="md:hidden p-2 -ml-2 text-white/40"><ChevronLeft size={24} /></button>
                  <div className="w-14 h-14 bg-white/5 rounded-[22px] flex items-center justify-center text-white/20 border border-white/5 font-black italic shadow-xl overflow-hidden">
                     {activeConv.contact_photo ? (
                        <img src={activeConv.contact_photo} className="w-full h-full object-cover" alt="" />
                     ) : getInitials(getDisplayContactName(activeConv, currentUserName), activeConv.contact_phone)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter mb-0.5">{getDisplayContactName(activeConv, currentUserName)}</h2>
                    <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                       <Hash size={12} className="text-[#A1A1AA]" /> #{getDisplayContactPhone(activeConv.contact_phone)}
                    </p>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => updateStatus.mutate({ id: activeConv.id, status: activeConv.status === "resolved" ? "open" : "resolved" })}
                    className="h-12 px-6 rounded-2xl border border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95"
                  >
                    <CircleDot size={16} className={activeConv.status === "resolved" ? "text-white/20" : "text-zinc-500 shadow-[0_0_10px_#A1A1AA]"} />
                    {activeConv.status === "resolved" ? "REABRIR" : "RESOLVER CASO"}
                  </button>
                  <div className={`flex items-center gap-3 p-1.5 rounded-2xl border ${activeConv.ai_enabled !== false ? "bg-zinc-500/10 border-zinc-500/20" : "bg-white/5 border-white/5"}`}>
                     <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${activeConv.ai_enabled !== false ? "bg-zinc-500 text-black" : "bg-black/20 text-white/40"}`}>
                        <Bot size={14} className={activeConv.ai_enabled !== false ? "animate-bounce" : ""} />
                        <span className="text-[9px] font-black uppercase tracking-widest">IA ATIVA</span>
                     </div>
                     <button 
                       onClick={() => toggleAi.mutate({ id: activeConv.id, ai_enabled: !(activeConv.ai_enabled !== false) })}
                       className={`w-10 h-5 rounded-full relative transition-all ${activeConv.ai_enabled !== false ? "bg-zinc-500" : "bg-white/10"}`}
                     >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${activeConv.ai_enabled !== false ? "right-1" : "left-1"}`} />
                     </button>
                  </div>
               </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px]">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] space-y-2 group`}>
                    <div className={`p-6 rounded-[32px] shadow-2xl transition-all relative ${
                      msg.from_me 
                        ? "bg-[#27272A] text-white rounded-tr-lg" 
                        : "bg-white/[0.04] text-white border border-white/5 rounded-tl-lg backdrop-blur-xl"
                    }`}>
                      {msg.type === "image" && msg.media_url && (
                        <img src={msg.media_url} className="rounded-2xl mb-4 max-h-[400px] object-contain shadow-inner" alt="" />
                      )}
                      {msg.status === "internal" ? (
                        <div className="space-y-3">
                           <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                               <Sparkles size={12} /> RESUMO DA IA
                           </div>
                           <p className="text-sm font-medium leading-relaxed text-zinc-100/80 italic font-['Inter']" dangerouslySetInnerHTML={{ __html: formatSummary(msg.content) }} />
                        </div>
                      ) : (
                        <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-3 px-3 ${msg.from_me ? "justify-end" : "justify-start"}`}>
                       <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{format(new Date(msg.created_at), "HH:mm")}</span>
                       {msg.from_me && <MessageStatus status={msg.status} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-10 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
               <div className="bg-[#0A0A0A] border border-white/5 rounded-[40px] p-3 flex items-center gap-5 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] focus-within:border-[#27272A]/50 focus-within:ring-4 focus-within:ring-[#27272A]/10 transition-all outline-none">
                  <div className="flex items-center gap-2 pl-4">
                     <button className="w-12 h-12 flex items-center justify-center text-white/20 hover:text-white transition-all hover:bg-white/5 rounded-full"><Paperclip size={22} /></button>
                     <button className="w-12 h-12 flex items-center justify-center text-white/20 hover:text-white transition-all hover:bg-white/5 rounded-full"><Smile size={22} /></button>
                  </div>
                  <input 
                    placeholder="Escreva sua mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="flex-1 bg-transparent border-none outline-none text-[16px] text-white py-6 px-4 placeholder:text-white/10"
                  />
                  <div className="flex items-center gap-2 pr-2">
                     <button 
                       onClick={() => setSendAsAudio(!sendAsAudio)}
                       className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${sendAsAudio ? "bg-[#27272A] text-white" : "text-white/20 hover:text-white"}`}
                     >
                       <Mic size={20} />
                     </button>
                     <button 
                       onClick={handleSend}
                       disabled={!messageText.trim() || sendMessage.isPending}
                       className="h-14 px-8 bg-[#27272A] border border-[#27272A] hover:border-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.1)] disabled:opacity-20"
                     >
                       {sendMessage.isPending ? <Loader2 size={18} className="animate-spin" /> : "SEND"}
                     </button>
                  </div>
               </div>
            </div>
          </>
        )}
      </main>

      {/* ── INFO PANEL (Right Sidebar) ── */}
      <aside className="hidden xl:flex w-80 flex-col border-l border-white/5 bg-[#0A0A0A] overflow-hidden z-10">
         <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-none">
            {activeConv ? (
              <>
                 {/* Histórico de Resumos */}
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Sparkles size={18} className="text-[#27272A]" />
                          <h3 className="text-sm font-black uppercase tracking-widest text-[#27272A]">Logs de IA</h3>
                       </div>
                       {messages.filter(m => m.status === "internal").length > 3 && (
                         <button 
                           onClick={() => setFilterLabelId("all_summaries")}
                           className="text-[10px] font-black uppercase tracking-widest text-[#27272A] hover:underline"
                         >
                           Ver todos
                         </button>
                       )}
                    </div>
                    <div className="space-y-3">
                       {messages.filter(m => m.status === "internal").reverse().slice(0, 3).map((summary) => (
                         <div 
                           key={summary.id}
                           className="group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer relative overflow-hidden"
                         >
                            <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center gap-2">
                                  <Clock size={10} className="text-white/20" />
                                  <span className="text-[9px] font-black uppercase text-white/30">{format(new Date(summary.created_at), "dd/MM HH:mm")}</span>
                               </div>
                               <Bot size={12} className="text-[#27272A]/40 group-hover:text-[#27272A] transition-colors" />
                            </div>
                            <div className="text-[11px] text-white/50 line-clamp-2 italic font-['Inter'] leading-relaxed" dangerouslySetInnerHTML={{ __html: formatSummary(summary.content) }} />
                            
                            {/* Overlay Clickable */}
                            <button 
                              onClick={() => {
                                toast({ 
                                  title: "Resumo da IA", 
                                  description: <div className="text-[12px] leading-relaxed max-h-[300px] overflow-y-auto pr-2 mt-2" dangerouslySetInnerHTML={{ __html: formatSummary(summary.content) }} /> 
                                });
                              }}
                              className="absolute inset-0 z-10"
                            />
                         </div>
                       ))}
                       {messages.filter(m => m.status === "internal").length === 0 && (
                         <div className="p-10 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                            <BotOff size={20} className="text-white/5" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/10 italic">Sem logs registrados</p>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Tag size={18} className="text-[#A1A1AA]" />
                          <h3 className="text-sm font-black uppercase tracking-widest text-[#A1A1AA]">Etiquetas do Caso</h3>
                       </div>
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <button className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white">
                                <Plus size={16} />
                             </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-[#0F0F0F] border-white/5 p-2 rounded-2xl">
                             {allLabels.map(label => {
                               const isAssigned = activeConv.labels?.some(l => l.id === label.id);
                               return (
                                 <DropdownMenuItem 
                                   key={label.id}
                                   onClick={() => {
                                     if (isAssigned) {
                                       unassignLabel.mutate({ conversationId: activeConv.id, labelId: label.id });
                                     } else {
                                       assignLabel.mutate({ conversationId: activeConv.id, labelId: label.id });
                                     }
                                   }}
                                   className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer group"
                                 >
                                    <div className={`w-3 h-3 rounded-full border-2 ${isAssigned ? "bg-white border-white scale-110" : "border-white/10"}`} style={{ backgroundColor: isAssigned ? label.color : 'transparent' }} />
                                    <span className={cn("text-[11px] font-bold uppercase tracking-tight", isAssigned ? "text-white" : "text-white/40")}>{label.name}</span>
                                 </DropdownMenuItem>
                               );
                             })}
                          </DropdownMenuContent>
                       </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {activeConv.labels?.map(l => (
                         <div 
                           key={l.id} 
                           className="group flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all animate-in fade-in zoom-in duration-200"
                         >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{l.name}</span>
                            <button 
                              onClick={() => unassignLabel.mutate({ conversationId: activeConv.id, labelId: l.id })}
                              className="ml-1 text-white/10 hover:text-zinc-500 transition-colors"
                            >
                               <X size={12} />
                            </button>
                         </div>
                       ))}
                       {(!activeConv.labels || activeConv.labels.length === 0) && (
                         <p className="text-[11px] text-white/20 italic">Nenhuma etiqueta atribuída.</p>
                       )}
                    </div>
                 </div>
              </>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center p-8 text-center bg-white/[0.02] rounded-[40px] border border-white/5">
                 <User size={32} className="text-white/5 mb-4" />
                 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/10 italic">Aguardando Seleção</p>
              </div>
            )}

            {/* Gerenciador de Etiquetas Global */}
            <div className="border-t border-white/5 pt-10 space-y-8">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white/60">
                     <Palette size={18} />
                     <h3 className="text-sm font-black uppercase tracking-widest">Gerenciar Hub</h3>
                  </div>
                  <button 
                    onClick={() => setIsCreatingLabel(!isCreatingLabel)}
                    className="text-[10px] font-black uppercase tracking-widest text-[#A1A1AA] hover:scale-105 transition-all flex items-center gap-2"
                  >
                    {isCreatingLabel ? <X size={16} /> : <PlusCircle size={16} />}
                  </button>
               </div>

               <AnimatePresence>
                  {isCreatingLabel && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                       <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 space-y-6 mb-8">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Nome</label>
                             <input 
                               value={newLabelName}
                               onChange={(e) => setNewLabelName(e.target.value)}
                               placeholder="Ex: Urgente"
                               className="w-full h-12 bg-black border border-white/5 rounded-2xl px-4 text-xs font-bold outline-none focus:border-[#A1A1AA]/50 transition-all uppercase tracking-widest"
                             />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Cor</label>
                                <div className="flex items-center justify-center h-12 bg-black border border-white/5 rounded-2xl group-hover:border-white/10 transition-all overflow-hidden relative">
                                   <input 
                                     type="color"
                                     value={newLabelColor}
                                     onChange={(e) => setNewLabelColor(e.target.value)}
                                     className="w-full h-full bg-transparent border-none cursor-pointer scale-[2.5] absolute inset-0"
                                   />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Ordem</label>
                                <div className="flex items-center justify-between h-12 bg-black border border-white/5 rounded-2xl px-4">
                                   <span className="text-xs font-black text-[#A1A1AA]">{newLabelPriority}</span>
                                   <div className="flex flex-col">
                                      <button onClick={() => setNewLabelPriority(p => Math.max(1, p - 1))} className="hover:text-white text-white/20"><ChevronUp size={14} /></button>
                                      <button onClick={() => setNewLabelPriority(p => p + 1)} className="hover:text-white text-white/20"><ChevronDown size={14} /></button>
                                   </div>
                                </div>
                             </div>
                          </div>

                          <button 
                            disabled={!newLabelName || createLabel.isPending}
                            onClick={() => {
                              createLabel.mutate({ name: newLabelName, color: newLabelColor, priority: newLabelPriority }, {
                                onSuccess: () => {
                                  setNewLabelName("");
                                  setIsCreatingLabel(false);
                                  toast({ title: "Etiqueta Criada", description: "Design salvo com sucesso." });
                                }
                              });
                            }}
                            className="w-full h-12 bg-[#A1A1AA] text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                          >
                            {createLabel.isPending ? "SALVANDO..." : "CRIAR ETIQUETA"}
                          </button>
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>

               <div className="space-y-3">
                  {allLabels.map((l) => (
                    <div 
                      key={l.id} 
                      onClick={() => setFilterLabelId(l.id)}
                      className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-4 h-4 rounded-lg flex items-center justify-center text-[8px] font-black bg-black border border-white/10 text-white/40">
                             {l.priority}
                          </div>
                          <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]" style={{ backgroundColor: l.color }} />
                          <span className="text-[11px] font-bold uppercase tracking-tight text-white/80">{l.name}</span>
                       </div>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           if (confirm(`Excluir a etiqueta "${l.name}"?`)) {
                             deleteLabel.mutate(l.id);
                           }
                         }}
                         className="p-2 opacity-0 group-hover:opacity-100 hover:bg-zinc-500/10 hover:text-zinc-500 rounded-lg transition-all text-white/10"
                       >
                          <Trash2 size={14} />
                       </button>
                    </div>
                  ))}
                  {allLabels.length === 0 && (
                    <p className="text-[11px] text-white/10 italic text-center py-10">Nenhuma etiqueta no hub.</p>
                  )}
               </div>
            </div>
         </div>
      </aside>

      {/* ── FILTER MODAL ── */}
      <AnimatePresence>
        {filterLabelId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-10 backdrop-blur-2xl bg-black/80"
          >
             <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[80vh]"
             >
                {/* Modal Header */}
                <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                   <div>
                      <div className="flex items-center gap-3 mb-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: filterLabelId === "all_summaries" ? "#27272A" : allLabels.find(l => l.id === filterLabelId)?.color }} />
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                           {filterLabelId === "all_summaries" ? "Registro Histórico" : "Filtro por Etiqueta"}
                         </span>
                      </div>
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                        {filterLabelId === "all_summaries" ? "Logs de IA" : allLabels.find(l => l.id === filterLabelId)?.name}
                      </h2>
                   </div>
                   <button 
                     onClick={() => setFilterLabelId(null)}
                     className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white"
                   >
                      <X size={24} />
                   </button>
                </div>

                {/* Modal Content - List */}
                <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-none">
                   {filterLabelId === "all_summaries" ? (
                     <div className="space-y-6">
                        {messages.filter(m => m.status === "internal").reverse().map((summary) => (
                           <div key={summary.id} className="p-8 rounded-[40px] bg-white/[0.02] border border-white/5 space-y-4">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <Clock size={14} className="text-[#27272A]" />
                                    <span className="text-xs font-black uppercase text-white/40">{format(new Date(summary.created_at), "dd/MM/yyyy • HH:mm:ss")}</span>
                                 </div>
                                 <Bot size={18} className="text-[#27272A]" />
                              </div>
                              <div className="text-[14px] leading-relaxed text-white/70 italic font-['Inter']" dangerouslySetInnerHTML={{ __html: formatSummary(summary.content) }} />
                           </div>
                        ))}
                     </div>
                   ) : filtered.filter(c => c.labels?.some(l => l.id === filterLabelId)).length === 0 ? (
                      <div className="py-20 text-center space-y-4 opacity-20">
                         <Search size={40} className="mx-auto" />
                         <p className="text-xs font-black uppercase tracking-widest">Nenhuma conversa encontrada</p>
                      </div>
                   ) : (
                     filtered.filter(c => c.labels?.some(l => l.id === filterLabelId)).map(conv => (
                       <button 
                         key={conv.id}
                         onClick={() => {
                           setSelectedConv(conv);
                           setFilterLabelId(null);
                           setShowChatMobile(true);
                         }}
                         className="w-full p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all flex items-center gap-6 group"
                       >
                          <div className="w-16 h-16 bg-white/5 rounded-[22px] flex items-center justify-center text-white/20 border border-white/5 font-black italic shadow-xl overflow-hidden">
                             {conv.contact_photo ? (
                                <img src={getOptimizedImageUrl(conv.contact_photo, 100, 80)} className="w-full h-full object-cover" alt="" />
                             ) : (
                               getInitials(getDisplayContactName(conv, currentUserName), conv.contact_phone)
                             )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                             <h4 className="text-[16px] font-black italic uppercase tracking-tight truncate mb-1">{getDisplayContactName(conv, currentUserName)}</h4>
                             <p className="text-[12px] font-medium text-white/30 truncate">{conv.last_message}</p>
                          </div>
                          <ArrowRight size={18} className="text-white/10 group-hover:text-[#A1A1AA] group-hover:translate-x-1 transition-all" />
                       </button>
                     ))
                   )}
                </div>

                {/* Modal Footer */}
                <div className="p-8 border-t border-white/5 bg-white/[0.01] flex justify-center">
                   <p className="text-[10px] font-black uppercase tracking-widest text-white/10 italic">Hub Allcance • Gestão Imersiva</p>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
