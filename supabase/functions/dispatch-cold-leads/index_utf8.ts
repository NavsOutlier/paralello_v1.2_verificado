import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const webhookUrl = Deno.env.get('LEADS_DISPATCH_WEBHOOK') ?? Deno.env.get('AUTOMATION_DISPATCH_WEBHOOK') ?? ''

        if (!webhookUrl) {
            throw new Error('LEADS_DISPATCH_WEBHOOK or AUTOMATION_DISPATCH_WEBHOOK is not configured')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)
        const { template_name, language, category, targets, variables } = await req.json()

        if (!template_name || !targets || !Array.isArray(targets) || targets.length === 0) {
            throw new Error('Missing required fields: template_name and targets[]')
        }

        console.log(`[dispatch-cold-leads] Starting dispatch: template=${template_name}, targets=${targets.length}`)

        const logs: string[] = []
        const failed: string[] = []

        for (const target of targets) {
            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        source: 'paralello_leads',
                        type: 'cold_dispatch',
                        payload: {
                            template_name,
                            language: language || 'pt_BR',
                            category: category || 'marketing',
                            to: target,
                            components: variables || []
                        }
                    })
                })

                if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error(`Webhook ${response.status}: ${errorText}`)
                }

                logs.push(`✓ ${target}`)
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err)
                console.error(`[dispatch-cold-leads] Failed for ${target}:`, message)
                failed.push(`✗ ${target}: ${message}`)
            }
        }

        console.log(`[dispatch-cold-leads] Complete: ${logs.length} sent, ${failed.length} failed`)

        return new Response(JSON.stringify({
            success: true,
            dispatched: logs.length,
            failed_count: failed.length,
            details: logs,
            errors: failed
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[dispatch-cold-leads] Critical error:', message)
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
