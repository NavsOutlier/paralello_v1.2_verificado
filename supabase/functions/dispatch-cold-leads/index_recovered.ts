import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const webhookUrl = Deno.env.get('LEADS_DISPATCH_WEBHOOK') ?? Deno.env.get('AUTOMATION_DISPATCH_WEBHOOK') ?? ''

        if (!webhookUrl) {
            throw new Error('Webhook URL not configured')
        }

        // 1. We receive the "flat" payload from the UI
        const requestData = await req.json()

        // 2. We extract the list of targets (phones)
        const { targets, ...metadata } = requestData

        if (!targets || !Array.isArray(targets)) {
            throw new Error('Missing targets array')
        }

        console.log(`[dispatch-cold-leads] Forwarding to webhook: ${targets.length} leads`)

        const results = []

        // 3. For each target, we build the EXACT structure shown in the user's reference image
        for (const target of targets) {
            try {
                const finalPayload = {
                    source: 'paralello_leads',
                    type: 'cold_dispatch',
                    payload: {
                        client_id: metadata.client_id,
                        organization_id: metadata.organization_id,
                        user_id: metadata.user_id,
                        client_name: metadata.client_name,
                        sender_target: metadata.sender_target,
                        template_name: metadata.template_name,
                        language: metadata.language || 'pt_BR',
                        category: metadata.category || 'marketing',
                        to: target,
                        components: metadata.variables || [] // 'components' in reference image is 'variables' in UI
                    }
                }

                console.log(`[dispatch-cold-leads] Sending payload for ${target}:`, JSON.stringify(finalPayload))

                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalPayload)
                })

                if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error(`Webhook error (${response.status}): ${errorText}`)
                }

                results.push({ target, success: true })
            } catch (err) {
                console.error(`[dispatch-cold-leads] Failed for ${target}:`, err.message)
                results.push({ target, success: false, error: err.message })
            }
        }

        return new Response(JSON.stringify({
            success: true,
            results,
            failed_count: results.filter(r => !r.success).length
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('[dispatch-cold-leads] Fatal error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
