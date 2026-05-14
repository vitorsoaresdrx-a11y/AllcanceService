import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Bike,
  Lock,
  ArrowRight,
  ArrowLeft,
  Shield,
  Store,
  Wrench,
  User,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "select" | "password" | "names" | "email";
type StationId = "admin" | "salao" | "mecanica";

interface Station {
  id: StationId;
  label: string;
  desc: string;
  icon: typeof Shield;
  accent: string;
  iconBg: string;
}

const STATIONS: Station[] = [
  {
    id: "admin",
    label: "Administração",
    desc: "Acesso completo ao sistema",
    icon: Shield,
    accent: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "salao",
    label: "Salão",
    desc: "PDV, produtos, estoque, caixa e atendimento",
    icon: Store,
    accent: "text-zinc-500",
    iconBg: "bg-zinc-500/10",
  },
  {
    id: "mecanica",
    label: "Oficina",
    desc: "Serviços e manutenção",
    icon: Wrench,
    accent: "text-zinc-500",
    iconBg: "bg-zinc-500/10",
  },
];

// ─── Design Primitives ──────────────────────────────────────────────────────

const Btn = ({
  children,
  className = "",
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-2xl bg-primary hover:bg-primary/80 text-primary-foreground font-bold tracking-wide shadow-[0_10px_30px_hsl(var(--primary)/0.3)] transition-all active:scale-95 disabled:opacity-70 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const InputEl = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`flex w-full bg-card border border-border h-14 px-4 rounded-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/70 ${className}`}
    {...props}
  />
);

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Login() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("select");
  const [station, setStation] = useState<Station | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [salaoNames, setSalaoNames] = useState<string[]>([]);
  const [pendingSession, setPendingSession] = useState<{
    access_token: string;
    refresh_token: string;
  } | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const imageUrl =
    "https://i.postimg.cc/Fskx40s9/logo-allcance.png";

  const handleSelectStation = (s: Station) => {
    setStation(s);
    setStep("password");
    setPassword("");
  };

  const handleBack = () => {
    if (step === "names") {
      // Discard the pending session
      setPendingSession(null);
      setSalaoNames([]);
    }
    setStep(step === "names" ? "password" : "select");
    setPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("station-login", {
        body: { station: station.id, password },
      });

      if (error) {
        // Try to parse the error body for a user-friendly message
        const msg = data?.error || "Erro de conexão. Verifique se as estações estão configuradas em Configurações.";
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      const session = data.session;

      if (station.id === "salao") {
        // Hold session, show name picker
        setPendingSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        setSalaoNames(data.salao_names || []);
        setStep("names");
      } else {
        // Set session immediately
        localStorage.setItem("station_type", station.id);
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }
    } catch (err: any) {
      toast({
        title: err.message || "Erro na autenticação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const pass = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      localStorage.setItem("station_type", "admin");
    } catch (err: any) {
      toast({
        title: err.message || "Erro na autenticação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectName = async (name: string) => {
    if (!pendingSession) return;
    localStorage.setItem("station_type", "salao");
    localStorage.setItem("salao_user_name", name);
    await supabase.auth.setSession(pendingSession);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-primary/30">
      {/* Hero image */}
      <div className="relative w-full lg:w-[60%] h-[30vh] lg:h-screen overflow-hidden">
        <img
          src={imageUrl}
          alt=""
          className="sr-only"
          onLoad={() => setImgLoaded(true)}
        />
        <div
          className={`absolute inset-0 bg-zinc-950 transition-all duration-1000`}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 gap-8">
          <img 
            src={imageUrl} 
            alt="Allcance Service" 
            className={`w-full max-w-sm object-contain transition-all duration-1000 ${
              imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          />
          <div className={`transition-all duration-1000 delay-300 ${imgLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h2 className="text-4xl font-black text-white tracking-[0.3em] uppercase">
              Allcance
            </h2>
            <p className="text-zinc-500 font-bold tracking-[0.5em] uppercase text-center mt-2">
              Service
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-8 relative z-10 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* ── STEP: Select Station ── */}
          {step === "select" && (
            <>
              <div className="space-y-3 text-center lg:text-left">
                <div className="lg:hidden flex justify-center mb-6">
                  <img src="/allcance-logo.png" alt="Allcance" className="h-12 w-auto object-contain" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">
                  Selecione seu acesso
                </h1>
                <p className="text-muted-foreground text-sm font-medium">
                  Escolha a estação para entrar no sistema.
                </p>
              </div>

              <div className="space-y-3">
                {STATIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStation(s)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 hover:border-muted-foreground/20 transition-all active:scale-[0.98] text-left group"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}
                    >
                      <s.icon className={`w-5 h-5 ${s.accent}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {s.label}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                ))}

                <div className="pt-4 border-t border-border/50">
                  <button
                    onClick={() => setStep("email")}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    Entrar com E-mail e Senha
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── STEP: Email Login ── */}
          {step === "email" && (
            <>
              <div className="space-y-3">
                <button
                  onClick={() => setStep("select")}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para Estações
                </button>
                <h1 className="text-xl font-black text-foreground tracking-tight">
                  Login por E-mail
                </h1>
                <p className="text-xs text-muted-foreground">
                  Acesse sua conta de administrador ou colaborador.
                </p>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    E-mail
                  </label>
                  <InputEl
                    name="email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    Senha
                  </label>
                  <InputEl
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                  />
                </div>
                <Btn type="submit" className="w-full h-14" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Entrar na Conta"}
                </Btn>
              </form>
            </>
          )}

          {/* ── STEP: Password ── */}
          {step === "password" && station && (
            <>
              <div className="space-y-3">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar
                </button>

                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${station.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <station.icon className={`w-5 h-5 ${station.accent}`} />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-foreground tracking-tight">
                      {station.label}
                    </h1>
                  </div>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground block ml-1 group-focus-within:text-primary transition-colors">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
                    <InputEl
                      type="password"
                      required
                      minLength={6}
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-12"
                    />
                  </div>
                </div>

                <Btn type="submit" className="w-full h-14" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      Entrar <ArrowRight size={18} />
                    </span>
                  )}
                </Btn>
              </form>
            </>
          )}

          {/* ── STEP: Salão Name Picker ── */}
          {step === "names" && (
            <>
              <div className="space-y-3">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar
                </button>

                <h1 className="text-xl font-black text-foreground tracking-tight">
                  Quem está no balcão?
                </h1>
                <p className="text-xs text-muted-foreground">
                  Selecione seu nome para identificar suas operações.
                </p>
              </div>

              {salaoNames.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum nome cadastrado.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Peça ao administrador para cadastrar os nomes do Salão em
                    Configurações.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {salaoNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleSelectName(name)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 hover:border-zinc-500/30 transition-all active:scale-95 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-zinc-500/10 flex items-center justify-center text-zinc-500 font-bold text-lg group-hover:scale-110 transition-transform">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-foreground truncate w-full text-center">
                        {name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground/70 font-medium italic">
              Acesso restrito a colaboradores autorizados da Allcance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
