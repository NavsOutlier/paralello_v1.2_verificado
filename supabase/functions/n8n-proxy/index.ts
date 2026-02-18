
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log(`Received ${req.method} request`)

        let body;
        try {
            const text = await req.text()
            if (!text) throw new Error("Empty body")
            body = JSON.parse(text)
        } catch (e) {
            console.error("JSON Parse Error:", e)
            throw new Error(`Invalid JSON body: ${e.message}`)
        }

        // Determine destination based on type or fallback to OAuth
        let n8nUrl = 'https://webhooks.blackback.com.br/webhook/oauth/callback'

        if (body.type === 'META_SYNC_TRIGGER') {
            n8nUrl = 'https://webhooks.blackback.com.br/webhook/meta/sync-trigger'
        }

        console.log(`Proxying ${body.type || 'OAUTH'} request to n8n: ${n8nUrl}`)

        const n8nResponse = await fetch(n8nUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...body,
                timestamp: body.timestamp || new Date().toISOString()
            }),
        })

        let responseData;
        const responseText = await n8nResponse.text();
        console.log("Response from n8n:", responseText);

        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { success: n8nResponse.ok, raw: responseText }
        }

        if (!n8nResponse.ok) {
            console.error("n8n Error Response:", responseText)
            throw new Error(`n8n Error: ${n8nResponse.status} - ${responseText.substring(0, 100)}`)
        }

        return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Proxy Error:", error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
