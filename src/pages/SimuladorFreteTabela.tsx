import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Truck, 
  MapPin, 
  Package, 
  Bike, 
  CheckCircle2, 
  Share2,
  Calculator,
  ArrowRight,
  ClipboardList,
  Search,
  Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { classifyLocality, MULTIPLIERS } from "@/utils/freightUtils";

interface FreightRule {
  cep_ini: number;
  cep_fim: number;
  cidade: string;
  uf: string;
  prazo: number;
  peso5: number;
  peso10: number;
  peso20: number;
  peso40: number;
  peso60: number;
  peso100: number;
  excedente_kg: number;
  gris_min: number;
  gris_pct: number;
  tas: number;
  pedagio_fixo: number;
  pedagio_fracao_kg: number;
}

const SimuladorFreteTabela = () => {
  const [cep, setCep] = useState("");
  const [productMode, setProductMode] = useState<"catalog" | "manual">("catalog");
  const [selectedBikeId, setSelectedBikeId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [tipoProduto, setTipoProduto] = useState<"quadro" | "bike_completa" | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Carregar bikes do sistema
  const { data: bikes = [] } = useQuery({
    queryKey: ["bikes_frete_tabela"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_models")
        .select("id, name, sale_price")
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const handleCalculate = async () => {
    if (!cep || !tipoProduto || (productMode === "catalog" && !selectedBikeId) || (productMode === "manual" && (!manualName || !manualValue))) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    setCalculating(true);
    const cleanCepString = cep.replace(/\D/g, "");
    if (cleanCepString.length !== 8) {
      toast.error("CEP incompleto. Digite os 8 números.");
      setCalculating(false);
      return;
    }
    const cleanCep = parseInt(cleanCepString);

    try {
      const { data, error } = await supabase
        .from("frete_tabela_rodonaves")
        .select("*")
        .lte("cep_ini", cleanCep)
        .gte("cep_fim", cleanCep)
        .single();

      if (error || !data) {
        toast.error("CEP não localizado na nossa tabela de frete.");
        setResult(null);
        return;
      }

      const rule = data as FreightRule;
      
      // CONFIGURAÇÃO FIXA Allcance
      const boxWeight = 15.5;
      const boxVolume = (78 * 20 * 148) / 1000000;
      const pesoTaxado = Math.max(boxWeight, boxVolume * 300); // 70kg
      
      const availableTiers = [
        { w: 100, v: Number(rule.peso100) },
        { w: 60, v: Number(rule.peso60) },
        { w: 40, v: Number(rule.peso40) },
        { w: 20, v: Number(rule.peso20) },
        { w: 10, v: Number(rule.peso10) },
        { w: 5, v: Number(rule.peso5) }
      ].filter(t => t.v > 0);

      if (availableTiers.length === 0) {
        toast.error("Erro nas faixas de preço para esta cidade.");
        return;
      }

      let basePrice = 0;
      const highestTier = availableTiers[0];
      const matchingTier = [...availableTiers].reverse().find(t => t.w >= pesoTaxado);

      if (matchingTier) {
        basePrice = matchingTier.v;
      } else {
        basePrice = highestTier.v + (pesoTaxado - highestTier.w) * (Number(rule.excedente_kg) || 0);
      }
      
      let bikeValue = 0;
      let finalName = "";

      if (productMode === "catalog") {
        const b = bikes.find(x => x.id === selectedBikeId);
        bikeValue = Number(b?.sale_price || 0);
        finalName = b?.name || "";
      } else {
        bikeValue = parseFloat(manualValue) || 0;
        finalName = manualName;
      }

      const gris = Math.max(Number(rule.gris_min) || 0, bikeValue * (Number(rule.gris_pct) || 0));
      const tas = Number(rule.tas) || 0;
      const pedagio = Number(rule.pedagio_fixo) || 0;
      
      const subtotalCSV = basePrice + gris + tas + pedagio;
      const bucket = classifyLocality(rule.cidade, rule.uf);
      const multiplier = MULTIPLIERS[bucket] || 1.65;
      const valorFinal = Math.ceil(subtotalCSV * multiplier);

      console.log("Freight Engine v3 Debug:", { 
        cep: cleanCep, 
        cidade: rule.cidade, 
        subtotalCSV: subtotalCSV.toFixed(2), 
        bucket, 
        multiplier, 
        valorFinal 
      });

      setResult({
        cidade: rule.cidade,
        uf: rule.uf,
        prazo: rule.prazo,
        valorFinal,
        bikeName: finalName,
        produtoTipo: tipoProduto === "quadro" ? "Quadro" : "Bike Completa",
      });

      toast.success("Frete calculado com sucesso!");
    } catch (err) {
      console.error("Freight Error:", err);
      toast.error("Erro interno. Tente novamente.");
    } finally {
      setCalculating(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!result) return;
    const text = `Frete Allcance\nBike: ${result.bikeName}\nSaída: Sorocaba-SP\nDestino: ${result.cidade}-${result.uf}\nValor: R$ ${result.valorFinal.toFixed(2)}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex items-center gap-3 px-1">
        <div className="p-3 rounded-2xl bg-zinc-800 text-white shadow-black/20">
          <Truck size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Simulador Tabela</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Cote fretes em segundos</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 border-2 border-border/60 bg-background/50 backdrop-blur rounded-[28px] space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Destino (CEP)</Label>
              <Input 
                placeholder="00000-000"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                className="h-12 rounded-xl font-bold border-2 bg-background focus-visible:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Produto</Label>
              <Tabs defaultValue="catalog" onValueChange={(v) => setProductMode(v as any)} className="w-full">
                <TabsList className="grid grid-cols-2 w-full h-11 rounded-xl p-1 bg-muted/50 border border-border">
                  <TabsTrigger value="catalog" className="rounded-lg text-[10px] font-black uppercase tracking-widest">Catálogo</TabsTrigger>
                  <TabsTrigger value="manual" className="rounded-lg text-[10px] font-black uppercase tracking-widest">Manual</TabsTrigger>
                </TabsList>
                <TabsContent value="catalog" className="mt-4 animate-in slide-in-from-left-2 duration-300">
                  <Select onValueChange={setSelectedBikeId} value={selectedBikeId}>
                    <SelectTrigger className="h-12 rounded-xl border-2 font-bold focus:ring-0">
                      <SelectValue placeholder="Selecione a bike..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bikes.map(bike => (
                        <SelectItem key={bike.id} value={bike.id} className="font-bold">
                          {bike.name} — R$ {Number(bike.sale_price).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="manual" className="mt-4 space-y-3 animate-in slide-in-from-right-2 duration-300">
                  <Input 
                    placeholder="Nome da Bike"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="h-12 rounded-xl font-bold border-2"
                  />
                  <Input 
                    type="number"
                    placeholder="Valor (R$)"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    className="h-12 rounded-xl font-bold border-2"
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Volume</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTipoProduto("quadro")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all h-14 ${tipoProduto === "quadro" ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border text-muted-foreground hover:border-primary/30"}`}
                >
                  <Package size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Quadro</span>
                </button>
                <button
                  onClick={() => setTipoProduto("bike_completa")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all h-14 ${tipoProduto === "bike_completa" ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border text-muted-foreground hover:border-primary/30"}`}
                >
                  <Bike size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Bike</span>
                </button>
              </div>
            </div>
          </div>

          <Button 
            disabled={calculating || !cep || (productMode === "catalog" && !selectedBikeId) || (productMode === "manual" && !manualName) || !tipoProduto}
            onClick={handleCalculate}
            className="w-full h-14 rounded-xl font-black uppercase tracking-[0.15em] text-xs gap-2 transition-transform active:scale-[0.98]"
          >
            {calculating ? <ArrowRight className="animate-spin" /> : <Calculator size={18} />}
            Calcular Frete
          </Button>
        </Card>

        <div className="flex flex-col gap-4">
          {!result ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border/80 rounded-[32px] opacity-40">
              <Truck size={36} className="mb-4 text-primary" />
              <p className="font-black uppercase text-[10px] tracking-widest">Aguardando cotação...</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in zoom-in-95 duration-300">
              <Card className="p-6 border-2 border-primary/20 bg-primary/5 rounded-[32px] space-y-6 relative overflow-hidden">
                <div className="space-y-1 relative z-10">
                  <div className="flex items-center gap-1.5 text-primary">
                    <CheckCircle2 size={12} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Cálculo Tabela</span>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight leading-none uppercase">{result.cidade}</h2>
                  <p className="text-sm font-bold text-muted-foreground">{result.uf} — Sorocaba Saída</p>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="p-4 bg-background/80 rounded-2xl border border-border shadow-sm">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Prazo</span>
                    <span className="text-xl font-black leading-none">{result.prazo} <span className="text-[10px] opacity-50">DIAS</span></span>
                  </div>
                  <div className="p-4 bg-background/80 rounded-2xl border border-border shadow-sm">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Produto</span>
                    <span className="text-xs font-black leading-none truncate block">{result.produtoTipo}</span>
                  </div>
                </div>

                <div className="p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 flex items-end justify-between relative z-10 overflow-hidden group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Custo Final</span>
                    <span className="text-4xl font-black leading-none tracking-tighter">R$ {result.valorFinal.toFixed(2)}</span>
                  </div>
                  <Share2 className="opacity-40 group-hover:opacity-100 transition-opacity" size={24} />
                </div>

                <div className="absolute -bottom-6 -right-6 opacity-[0.03] rotate-12 -z-0">
                  <Truck size={180} />
                </div>
              </Card>

              <Button 
                onClick={handleShareWhatsApp}
                className="w-full h-14 bg-zinc-600 hover:bg-zinc-700 text-white rounded-xl font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-emerald-500/20"
              >
                <Share2 size={18} />
                Compartilhar no WhatsApp
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimuladorFreteTabela;
