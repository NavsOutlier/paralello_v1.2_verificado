
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { agent_id, message, session_id, transaction_id, context } = await req.json()

        if (!agent_id || !message) {
            throw new Error('Missing agent_id or message')
        }

        // Idempotency Check (Optional)
        // If the client sends a transaction_id (e.g. n8n execution ID), we could check if we already processed it.
        // For now, we will just log it.

        // 1. Fetch Agent Config
        const { data: agent, error: agentError } = await supabase
            .from('ai_agents')
            .select('*')
            .eq('id', agent_id)
            .single()

        if (agentError || !agent) throw new Error('Agent not found')

        // Security Check: Verify Bearer Token matches Agent
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const token = authHeader.replace('Bearer ', '').trim()
        if (!token) throw new Error('Invalid Authorization token')

        // Hash the token to compare with stored hash
        const encoder = new TextEncoder()
        const data = encoder.encode(token)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        if (agent.api_key_hash !== hashHex) {
            throw new Error('Invalid API Key')
        }

        if (!agent.api_key) throw new Error('Agent has no LLM API Key configured for execution')

        // 2. Fetch Prompts
        const { data: prompts } = await supabase
            .from('ai_agent_prompt_sections')
            .select('content')
            .eq('agent_id', agent_id)
            .eq('is_active', true)
            .order('section_order', { ascending: true })

        const systemPrompt = prompts?.map(p => p.content).join('\n\n') || 'You are a helpful assistant.'

        // 3. Call LLM (OpenAI Example for MVP)
        let aiResponse = ''
        let tokensUsed = 0
        const startTime = Date.now()

        if (agent.provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${agent.api_key}`
                },
                body: JSON.stringify({
                    model: agent.model || 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message } // TODO: inject context here if needed
                    ],
                    temperature: agent.temperature || 0.7,
                    max_tokens: agent.max_tokens || 1000
                })
            })

            const data = await response.json()
            if (data.error) throw new Error(`OpenAI Error: ${data.error.message}`)

            aiResponse = data.choices[0].message.content
            tokensUsed = data.usage.total_tokens
        } else if (agent.provider === 'anthropic') {
            aiResponse = "Anthropic integration coming soon. Simulating response."
            tokensUsed = 10
        } else {
            // Mock
            aiResponse = `[Mock Response] You said: ${message}`
            tokensUsed = 5
        }

        const endTime = Date.now()
        const duration = endTime - startTime

        // 4. Auto-Log Interaction
        // We log every execution to build the Metrics later
        // Ideally we would push to a queue, but here we insert directly.
        // We do NOT stop execution if logging fails to ensure reliability of the primary function.
        await supabase.from('ai_usage_logs').insert({
            agent_id: agent_id,
            timestamp: new Date().toISOString(),
            tokens_input: 0, // Simplified for now
            tokens_output: tokensUsed, // Simplified
            model: agent.model,
            cost_usd: 0, // TODO: calculate based on model
            context: { session_id, transaction_id, ...context }
        })

        // 5. Return Response
        return new Response(
            JSON.stringify({
                response: aiResponse,
                tokens_used: tokensUsed,
                agent_id: agent_id,
                duration_ms: duration,
                transaction_id: transaction_id
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
