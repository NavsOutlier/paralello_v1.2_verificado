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
        // Create Supabase Client with Service Role (Admin)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const n8nWebhookUrl = Deno.env.get('AUTOMATION_DISPATCH_WEBHOOK') ?? ''

        if (!n8nWebhookUrl) {
            throw new Error('AUTOMATION_DISPATCH_WEBHOOK is not defined in environment variables')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        const now = new Date()
        const logs: string[] = []

        // ============================================
        // 1. Process Scheduled Messages (Disparos)
        // ============================================
        const { data: messages, error: msgError } = await supabase
            .from('scheduled_messages')
            .select('*, client:clients(name, whatsapp, whatsapp_group_id)')
            .eq('status', 'pending')
            .lte('scheduled_at', now.toISOString())

        if (msgError) throw msgError

        for (const msg of messages || []) {
            try {
                // Determine target (Group or Individual)
                const target = msg.client.whatsapp_group_id || msg.client.whatsapp
                if (!target) throw new Error('Client has no WhatsApp number or Group ID')

                // Send to n8n Webhook
                const response = await fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        source: 'paralello_automation',
                        type: 'message',
                        payload: {
                            message_id: msg.id,
                            client_id: msg.client_id,
                            organization_id: msg.organization_id,
                            client_name: msg.client.name,
                            target_number: target,
                            content: msg.message,
                            scheduled_at: msg.scheduled_at
                        }
                    })
                })

                if (!response.ok) throw new Error(`n8n Webhook Error: ${response.statusText}`)

                // Update Status
                await supabase
                    .from('scheduled_messages')
                    .update({ status: 'sent', sent_at: new Date().toISOString() })
                    .eq('id', msg.id)

                logs.push(`Message sent to n8n for ${msg.client.name}`)

            } catch (err: any) {
                console.error(`Failed to send message ${msg.id} to n8n:`, err)
                await supabase
                    .from('scheduled_messages')
                    .update({ status: 'failed' })
                    .eq('id', msg.id)
                logs.push(`Failed to send message to n8n for ${msg.client.name}: ${err.message}`)
            }
        }

        // ============================================
        // 2. Process Scheduled Reports
        // ============================================
        const { data: reports, error: reportError } = await supabase
            .from('scheduled_reports')
            .select('*, client:clients(name, whatsapp, whatsapp_group_id)')
            .eq('is_active', true)
            .lte('next_run', now.toISOString())

        if (reportError) throw reportError

        for (const report of reports || []) {
            try {
                // 2.1 Calculate Date Range
                const endDate = new Date(now)
                endDate.setDate(endDate.getDate() - 1) // Yesterday as end of data period usually
                const startDate = new Date(endDate)

                let periodText = ''

                if (report.frequency === 'daily') {
                    // Start = End = Yesterday
                    periodText = endDate.toLocaleDateString('pt-BR')
                } else if (report.frequency === 'weekly') {
                    startDate.setDate(startDate.getDate() - 6) // Last 7 days
                    periodText = `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`
                } else if (report.frequency === 'monthly') {
                    startDate.setMonth(startDate.getMonth() - 1)
                    startDate.setDate(1) // First day of last month
                    // End date is last day of last month
                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
                    endDate.setTime(lastMonthEnd.getTime())
                    periodText = `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`
                }

                const startStr = startDate.toISOString().split('T')[0]
                const endStr = endDate.toISOString().split('T')[0]

                // 2.2 Fetch Metrics

                // Leads
                const { count: leadsCount } = await supabase
                    .from('marketing_leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('client_id', report.client_id)
                    .gte('first_interaction_at', startStr)
                    .lte('first_interaction_at', endStr + 'T23:59:59')

                // Conversions & Revenue
                const { data: conversions } = await supabase
                    .from('marketing_conversions')
                    .select('revenue')
                    .eq('client_id', report.client_id)
                    .gte('converted_at', startStr)
                    .lte('converted_at', endStr + 'T23:59:59')

                const conversionsCount = conversions?.length || 0
                const revenue = conversions?.reduce((sum, c) => sum + (c.revenue || 0), 0) || 0

                // Manual Data (Investment, Clicks, Impressions)
                const { data: manualData } = await supabase
                    .from('marketing_daily_performance')
                    .select('investment, clicks, impressions')
                    .eq('client_id', report.client_id)
                    .gte('date', startStr)
                    .lte('date', endStr)

                const investment = manualData?.reduce((sum, d) => sum + (d.investment || 0), 0) || 0
                const clicks = manualData?.reduce((sum, d) => sum + (d.clicks || 0), 0) || 0
                const impressions = manualData?.reduce((sum, d) => sum + (d.impressions || 0), 0) || 0

                // 2.3 Calculate Derived Metrics
                const cpl = leadsCount && leadsCount > 0 ? investment / leadsCount : 0
                const roas = investment > 0 ? revenue / investment : 0
                const conversionRate = leadsCount && leadsCount > 0 ? (conversionsCount / leadsCount) * 100 : 0
                const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0

                // 2.4 Replace Variables in Template
                let content = report.template

                const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
                const formatNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v)

                const replacements: Record<string, string> = {
                    '{{client_nome}}': report.client.name,
                    '{{period}}': periodText,
                    '{{leads}}': formatNum(leadsCount || 0),
                    '{{conversions}}': formatNum(conversionsCount),
                    '{{revenue}}': formatCurrency(revenue),
                    '{{investment}}': formatCurrency(investment),
                    '{{spend}}': formatCurrency(investment), // Alias
                    '{{cpl}}': formatCurrency(cpl),
                    '{{roas}}': `${roas.toFixed(2)}x`,
                    '{{conversion_rate}}': `${conversionRate.toFixed(2)}%`,
                    '{{clicks}}': formatNum(clicks),
                    '{{impressions}}': formatNum(impressions),
                    '{{ctr}}': `${ctr.toFixed(2)}%`
                }

                for (const [key, value] of Object.entries(replacements)) {
                    content = content.replace(new RegExp(key, 'g'), value)
                }

                // 2.5 Send to n8n Webhook
                const target = report.client.whatsapp_group_id || report.client.whatsapp
                if (!target) throw new Error('No WhatsApp target')

                const response = await fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        source: 'paralello_automation',
                        type: 'report',
                        payload: {
                            report_id: report.id,
                            client_id: report.client_id,
                            organization_id: report.organization_id,
                            client_name: report.client.name,
                            target_number: target,
                            content: content,
                            metrics: {
                                leads: leadsCount,
                                investment,
                                revenue,
                                conversions: conversionsCount,
                                cpl,
                                roas
                            },
                            period: periodText
                        }
                    })
                })

                if (!response.ok) throw new Error(`n8n Webhook Error: ${response.statusText}`)

                // 2.6 Update Next Run
                const nextRun = new Date(report.next_run)
                if (report.frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1)
                else if (report.frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7)
                else if (report.frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1)

                await supabase
                    .from('scheduled_reports')
                    .update({ next_run: nextRun.toISOString() })
                    .eq('id', report.id)

                // 2.7 Log Execution
                await supabase.from('report_executions').insert({
                    report_id: report.id,
                    status: 'success',
                    metrics_snapshot: { leads: leadsCount, investment, revenue, conversions: conversionsCount },
                    sent_at: new Date().toISOString()
                })

                logs.push(`Report sent to n8n for ${report.client.name}`)

            } catch (err: any) {
                console.error(`Report failed for ${report.id}:`, err)
                // Log failure
                await supabase.from('report_executions').insert({
                    report_id: report.id,
                    status: 'failed',
                    error_message: err.message,
                    sent_at: new Date().toISOString()
                })
                logs.push(`Report failed for ${report.client.name}: ${err.message}`)
            }
        }

        // ============================================
        // 3. Process Active Suggestions (AI)
        // ============================================
        const { data: suggestions, error: suggError } = await supabase
            .from('active_suggestions')
            .select('*, client:clients(name, whatsapp, whatsapp_group_id)')
            .eq('status', 'approved')
            .is('sent_at', null)

        if (suggError) throw suggError

        for (const sugg of suggestions || []) {
            try {
                // Determine target
                const target = sugg.client.whatsapp_group_id || sugg.client.whatsapp
                if (!target) throw new Error('Client has no WhatsApp or Group ID')

                // Send to n8n Webhook
                const response = await fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        source: 'paralello_automation',
                        type: 'suggestion',
                        payload: {
                            suggestion_id: sugg.id,
                            client_id: sugg.client_id,
                            client_name: sugg.client.name,
                            target_number: target,
                            content: sugg.suggested_message
                        }
                    })
                })

                if (!response.ok) throw new Error(`n8n Webhook Error: ${response.statusText}`)

                // Update Status
                await supabase
                    .from('active_suggestions')
                    .update({ sent_at: new Date().toISOString() })
                    .eq('id', sugg.id)

                logs.push(`Suggestion sent to n8n for ${sugg.client.name}`)

            } catch (err: any) {
                console.error(`Suggestion dispatch failed for ${sugg.id}:`, err)
                logs.push(`Suggestion failed for ${sugg.client.name}: ${err.message}`)
            }
        }

        return new Response(JSON.stringify({ success: true, processed: logs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
