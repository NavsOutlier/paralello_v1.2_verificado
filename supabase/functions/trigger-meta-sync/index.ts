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
        console.log(`Received ${req.method} request to trigger meta sync`)

        let body;
        try {
            const text = await req.text()
            if (!text) throw new Error("Empty body")
            body = JSON.parse(text)
        } catch (e) {
            console.error("JSON Parse Error:", e)
            throw new Error(`Invalid JSON body: ${e.message}`)
        }

        const { client_id, organization_id, ad_account_id, meta_user_id } = body

        if (!client_id || !organization_id) {
            throw new Error('Missing required parameters: client_id and organization_id are required')
        }

        // Get webhook URL from environment variables WITH NO HARDCODED FALLBACK
        const webhookUrl = Deno.env.get('META_SYNC_WEBHOOK_URL')

        if (!webhookUrl) {
            console.error('SERVER CONFIG ERROR: META_SYNC_WEBHOOK_URL is not set in Supabase Secrets');
            throw new Error('Configuração interna do servidor ausente.');
        }

        console.log(`Triggering direct n8n webhook sync for client ${client_id} at ${webhookUrl}`)

        // Trigger n8n async (we don't wait for it to finish the 15-day sync)
        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id,
                organization_id,
                ad_account_id,
                meta_user_id,
                action: 'initial_sync',
                timestamp: new Date().toISOString()
            }),
        }).catch(err => {
            // We just log if the fetch request itself fails immediately
            console.error("Error triggering n8n webhook asynchronously:", err)
        })

        // Respond immediately to the frontend so the user isn't blocked
        return new Response(JSON.stringify({
            success: true,
            message: 'Sincronização iniciada em segundo plano'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error("Sync Trigger Error:", error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
