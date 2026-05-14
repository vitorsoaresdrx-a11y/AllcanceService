import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Truck, 
  Package, 
  Bike, 
  CheckCircle2, 
  Share2,
  Calculator,
  ArrowRight,
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

const SimuladorFreteInterno = () => {
  const [cep, setCep] = useState("");
  const [productMode, setProductMode] = useState<"catalog" | "manual">("catalog");
  const [selectedBikeId, setSelectedBikeId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: bikes = [] } = useQuery({
    queryKey: ["bikes_frete_interno"],
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
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      toast.error("CEP incompleto. Digite os 8 números.");
      return;
    }
    if (productMode === "catalog" && !selectedBikeId) {
      toast.error("Selecione uma bike do catálogo.");
      return;
    }
    if (productMode === "manual" && (!manualName || !manualValue)) {
      toast.error("Preencha o nome e valor da bike.");
      return;
    }

    setCalculating(true);
    setResult(null);

    try {
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

      const { data, error } = await supabase.functions.invoke("calcular-frete-rodonaves", {
        body: {
          destinationZip: cleanCep,
          invoiceValue: bikeValue,
          preset: "bike_completa", // Sempre bike_completa (mesmo peso)
          quantidade: 1,
        }
      });

      if (error) {
        let errorMsg = "Erro na cotação";
        try {
          const errorJson = await (error as any).context?.json();
          errorMsg = errorJson?.error || error.message;
        } catch (_) {
          errorMsg = error.message;
        }
        throw new Error(errorMsg);
      }

      if (!data.sucesso) throw new Error(data.error || "Erro na cotação");

      setResult({
        cidade: data.cidade || "Destino",
        uf: data.uf || "",
        prazo: data.prazoEntrega + 2,
        valorFinal: data.valorFrete + 30,
        bikeName: finalName,
      });

      toast.success("Cotação realizada com sucesso!");
    } catch (err: any) {
      console.error("Erro no cálculo:", err);
      toast.error(err.message || "Não foi possível calcular o frete.");
    } finally {
      setCalculating(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!result) return;
    const text = `Frete Allcance\nBike: ${result.bikeName}\nSaída: Sorocaba-SP\nDestino: ${result.cidade}${result.uf ? `-${result.uf}` : ""}\nValor: R$ ${Number(result.valorFinal).toFixed(2)}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex items-center gap-3 px-1">
        <div className="p-3 rounded-2xl bg-zinc-800 text-white shadow-black/20">
          <Truck size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Simulador de Frete</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Cotação oficial via Rodonaves API</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INPUT */}
        <Card className="p-5 border-2 border-border/60 bg-background/50 backdrop-blur rounded-[28px] space-y-6">
          <div className="space-y-4">
            {/* CEP */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Destino (CEP)</Label>
              <Input 
                placeholder="00000-000"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                className="h-12 rounded-xl font-bold border-2 bg-background focus-visible:ring-primary/20 transition-all"
              />
            </div>

            {/* PRODUTO */}
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
          </div>

          <Button 
            disabled={calculating || !cep || (productMode === "catalog" && !selectedBikeId) || (productMode === "manual" && (!manualName || !manualValue))}
            onClick={handleCalculate}
            className="w-full h-14 rounded-xl font-black uppercase tracking-[0.15em] text-xs gap-2 transition-transform active:scale-[0.98]"
          >
            {calculating ? <ArrowRight className="animate-spin" /> : <Calculator size={18} />}
            Calcular Frete
          </Button>
        </Card>

        {/* RESULTADO */}
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
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Cotação Oficial Rodonaves</span>
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
                    <span className="text-xs font-black leading-none truncate block">{result.bikeName || "Bike Completa"}</span>
                  </div>
                </div>

                <div className="p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 flex items-end justify-between relative z-10 overflow-hidden group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Custo Final</span>
                    <span className="text-4xl font-black leading-none tracking-tighter">R$ {Number(result.valorFinal).toFixed(2)}</span>
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

export default SimuladorFreteInterno;
