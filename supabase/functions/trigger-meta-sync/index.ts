import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
        } catch (e: any) {
            console.error("JSON Parse Error:", e)
            throw new Error(`Invalid JSON body: ${e.message}`)
        }

        const { client_id, organization_id, ad_account_id, meta_user_id } = body

        if (!client_id || !organization_id || !ad_account_id) {
            throw new Error('Missing required parameters: client_id, organization_id, ad_account_id are required')
        }

        // Get webhook URL from environment variables WITH NO HARDCODED FALLBACK
        const webhookUrl = Deno.env.get('META_SYNC_WEBHOOK_URL')

        if (!webhookUrl) {
            console.error('SERVER CONFIG ERROR: META_SYNC_WEBHOOK_URL is not set in Supabase Secrets');
            throw new Error('Configuração interna do servidor ausente.');
        }

        // Create Supabase Client to fetch the access token
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Fetch the active meta connection for this organization
        const { data: metaConnection, error: dbError } = await supabase
            .from('meta_connections')
            .select('access_token')
            .eq('organization_id', organization_id)
            .single()

        if (dbError || !metaConnection?.access_token) {
            console.error("Error fetching meta connection:", dbError)
            throw new Error("Conexão com o Meta não encontrada ou sem token de acesso.")
        }

        // Fetch the organization plan
        const { data: orgData } = await supabase
            .from('organizations')
            .select('plan')
            .eq('id', organization_id)
            .single()

        const payload = {
            body: {
                client_id,
                account_id: ad_account_id,
                access_token: metaConnection.access_token,
                plan: orgData?.plan || 'pro', // Default to 'pro' if not found
                action: 'META_SYNC_TRIGGER'
            }
        }

        console.log(`Triggering direct n8n webhook sync for client ${client_id} at ${webhookUrl}`)

        // Trigger n8n async
        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }).catch(err => {
            console.error("Error triggering n8n webhook asynchronously:", err)
        })

        // Respond immediately to the frontend
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
