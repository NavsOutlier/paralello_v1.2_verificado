import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const envOpenaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 0. Fetch OpenAI Key from System Settings (Priority)
        const { data: settingData } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'openai_api_key')
            .single()

        // Handle JSONB value which might be a string like '"sk-..."' or just 'sk-...' depending on how it was saved
        let dbApiKey = ''
        if (settingData?.value) {
            // If it's a JSON string, remove quotes. If it's a plain string, use it.
            const val = settingData.value
            dbApiKey = typeof val === 'string' ? val.replace(/"/g, '') : String(val)
        }

        const openaiApiKey = dbApiKey || envOpenaiApiKey

        if (!openaiApiKey || openaiApiKey === 'placeholder') {
            throw new Error('OPENAI_API_KEY is not defined in System Settings or Env')
        }

        const now = new Date()
        const currentWeekday = now.getDay() // 0 = Sunday, 1 = Monday...

        // 1. Get Active Automations for Today
        // We filter mainly by code, but we can do a basic check here if supabase supports array filtering well.
        // It's safer to fetch active ones and filter in memory for weekdays array.
        const { data: automations, error: autoError } = await supabase
            .from('active_automations')
            .select`*, client:clients(name, whatsapp, whatsapp_group_id)`
            .eq('is_active', true)

        if (autoError) throw autoError

        const todayAutomations = automations?.filter(a =>
            Array.isArray(a.weekdays) && a.weekdays.includes(currentWeekday)
        ) || []

        const logs: string[] = []

        for (const auto of todayAutomations) {
            try {
                // Check if we already generated a suggestion for this automation TODAY
                // to avoid spamming if the cron runs multiple times
                const startOfDay = new Date(now).setHours(0, 0, 0, 0)
                const startOfDayIso = new Date(startOfDay).toISOString()

                const { count } = await supabase
                    .from('active_suggestions')
                    .select('id', { count: 'exact', head: true })
                    .eq('automation_id', auto.id)
                    .gte('created_at', startOfDayIso)

                if (count && count > 0) {
                    logs.push(`Skipping ${auto.client.name}: Suggestion already exists for today.`)
                    continue
                }

                // 2. Fetch Context (Context Days)
                const daysAgo = auto.context_days || 7
                const dateLimit = new Date()
                dateLimit.setDate(dateLimit.getDate() - daysAgo)
                const dateLimitIso = dateLimit.toISOString()

                // 2.1 Last Messages (Sent context)
                const { data: messages } = await supabase
                    .from('messages')
                    .select('content, sender_type, created_at')
                    .eq('client_id', auto.client_id)
                    .gte('created_at', dateLimitIso)
                    .order('created_at', { ascending: true })
                    .limit(20)

                // 2.2 Tasks (Completed or Pending)
                const { data: tasks } = await supabase
                    .from('tasks')
                    .select('title, status, created_at')
                    .eq('client_id', auto.client_id)
                    .gte('created_at', dateLimitIso)
                    .order('created_at', { ascending: true })
                    .limit(10)

                // 3. Build Prompt
                const contextSummary = `
                Cliente: ${auto.client.name}
                
                Últimas Mensagens:
                ${messages?.map(m => `[${m.sender_type}]: ${m.content}`).join('\n') || 'Nenhuma mensagem recente.'}
                
                Tarefas Recentes:
                ${tasks?.map(t => `- ${t.title} (${t.status})`).join('\n') || 'Nenhuma tarefa recente.'}
                `

                const prompt = `
                Você é um Gerente de Sucesso do Cliente (CS). Seu objetivo é manter o cliente engajado.
                
                Analise o contexto abaixo dos últimos ${daysAgo} dias.
                Escreva 3 OPÇÕES DIFERENTES de mensagens de WhatsApp CURTAS e AMIGÁVEIS para enviar a este cliente hoje.
                
                Regras para CADA mensagem:
                - Se houve tarefas concluídas, mencione brevemente.
                - Se o cliente falou algo importante, mostre que você lembra.
                - Se está silêncio, apenas pergunte como estão as coisas.
                - NÃO use saudações genéricas como "Prezado". Use "Olá ${auto.client.name}" ou similar.
                - A mensagem deve parecer escrita por um humano, sem formatação excessiva.
                - Cada opção deve ter um tom ligeiramente diferente (mais formal, mais casual, mais direto).
                
                CONTEXTO:
                ${contextSummary}
                
                Responda APENAS com um JSON array contendo 3 strings, exemplo:
                ["Mensagem 1...", "Mensagem 2...", "Mensagem 3..."]
                `

                // 4. Call OpenAI
                const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiApiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: 'Você é um assistente útil. Sempre responda em JSON válido quando solicitado.' },
                            { role: 'user', content: prompt }
                        ],
                        max_tokens: 600
                    })
                })

                if (!aiResponse.ok) {
                    const err = await aiResponse.text()
                    throw new Error(`OpenAI Error: ${err}`)
                }

                const aiData = await aiResponse.json()
                const rawContent = aiData.choices[0]?.message?.content?.trim()

                if (!rawContent) throw new Error('Empty response from AI')

                // Parse the JSON array of options
                let options: string[] = []
                try {
                    options = JSON.parse(rawContent)
                    if (!Array.isArray(options) || options.length === 0) {
                        throw new Error('Invalid response format')
                    }
                } catch {
                    // Fallback: if not valid JSON, treat as single option
                    options = [rawContent]
                }

                // 5. Save Suggestion with options
                const { error: insertError } = await supabase
                    .from('active_suggestions')
                    .insert({
                        automation_id: auto.id,
                        client_id: auto.client_id,
                        suggested_options: options,
                        suggested_message: options[0], // Default to first option
                        context_summary: `Analisadas ${messages?.length || 0} mensagens e ${tasks?.length || 0} tarefas.`,
                        status: 'pending'
                    })

                if (insertError) throw insertError

                logs.push(`Generated ${options.length} suggestion(s) for ${auto.client.name}`)

            } catch (err: any) {
                console.error(`Error processing automation ${auto.id}:`, err)
                logs.push(`Error for ${auto.client?.name || 'unknown'}: ${err.message}`)
            }
        }

        return new Response(JSON.stringify({ success: true, logs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
