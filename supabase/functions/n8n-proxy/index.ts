import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { code, source, timestamp } = await req.json()

        if (!code) {
            throw new Error('Missing code parameter')
        }

        const n8nUrl = 'https://webhooks.blackback.com.br/webhook/oauth/callback'

        console.log(`Proxying request to n8n: ${n8nUrl}`)

        const n8nResponse = await fetch(n8nUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code,
                source,
                timestamp
            }),
        })

        if (!n8nResponse.ok) {
            const errorText = await n8nResponse.text()
            throw new Error(`n8n Error: ${n8nResponse.status} - ${errorText}`)
        }

        const data = await n8nResponse.json().catch(() => ({ success: true })) // Fallback if n8n returns no JSON

        return new Response(JSON.stringify(data), {
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
