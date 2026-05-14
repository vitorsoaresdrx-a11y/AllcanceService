import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EVOLUTION_URL = Deno.env.get("EVOLUTION_URL")
const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_INSTANCE")
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_KEY")

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Buscar eventos que começam nos próximos 60 mins e ainda não foram notificados
    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

    const { data: eventos, error: agendaError } = await supabase
      .from('agenda')
      .select('*')
      .eq('lembrete_enviado', false)
      .neq('tipo', 'lembrete') // Lembretes simples não têm horário
      .gte('data_inicio', now.toISOString())
      .lte('data_inicio', oneHourLater.toISOString())

    if (agendaError) throw agendaError

    if (!eventos || eventos.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum evento pendente para agora." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Buscar o número de WhatsApp configurado
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'whatsapp_numero')
      .single()

    if (configError) throw configError
    const numero = config.valor

    // 3. Loop de disparos
    for (const evento of eventos) {
      const horario = new Date(evento.data_inicio).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })

      const msg = `🔔 *LEMBRETE Allcance*\n\nEvento: *${evento.titulo}*\nHoras: *${horario}*\n\n${evento.descricao || "Sem descrição."}`

      const response = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_KEY!,
        },
        body: JSON.stringify({
          number: numero,
          text: msg,
        }),
      })

      if (response.ok) {
        // Marcar como enviado no banco
        await supabase
          .from('agenda')
          .update({ lembrete_enviado: true })
          .eq('id', evento.id)
      }
    }

    return new Response(JSON.stringify({ message: `${eventos.length} lembretes processados.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
