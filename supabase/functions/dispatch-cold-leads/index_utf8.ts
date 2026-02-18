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
            throw new Error('LEADS_DISPATCH_WEBHOOK not configured')
        }

        const requestData = await req.json()
        const { action, targets, ...metadata } = requestData

        // Case 1: Template Creation (via n8n type: template_creation)
        if (action === 'create_template') {
            const finalPayload = {
                source: 'paralello_leads',
                type: 'template_creation',
                payload: {
                    ...metadata,
                    // Ensure core fields are at the root of payload for n8n
                    template_name: metadata.template_name,
                    content: metadata.content,
                    category: metadata.category || 'marketing',
                    language: metadata.language || 'pt_BR'
                }
            }

            console.log(`[dispatch-cold-leads] ACTION: create_template -> ${metadata.template_name}`)

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload)
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Webhook error (${response.status}): ${errorText}`)
            }

            return new Response(JSON.stringify({ success: true, message: 'Template creation event sent' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Case 2: Standard Cold Dispatch (Loop over targets)
        if (!targets || !Array.isArray(targets)) {
            throw new Error('Missing targets array for dispatch action')
        }

        console.log(`[dispatch-cold-leads] ACTION: cold_dispatch -> ${targets.length} leads`)
        const results = []

        for (const target of targets) {
            try {
                const finalPayload = {
                    source: 'paralello_leads',
                    type: 'cold_dispatch',
                    payload: {
                        ...metadata,
                        to: target,
                        components: metadata.variables || []
                    }
                }

                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalPayload)
                })

                if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error(`Status ${response.status}: ${errorText}`)
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
