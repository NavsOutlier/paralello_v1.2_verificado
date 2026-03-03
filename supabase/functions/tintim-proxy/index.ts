import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const { customer_code, security_token } = body

        const discoveryUrl = Deno.env.get('TINTIM_DISCOVERY_URL')

        if (!discoveryUrl) {
            return new Response(JSON.stringify({ error: 'TINTIM_DISCOVERY_URL not configured in secrets' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            })
        }

        if (!customer_code || !security_token) {
            return new Response(JSON.stringify({ error: 'customer_code and security_token are required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        console.log(`Proxying discovery request to n8n webhook for customer: ${customer_code}`)

        // POST the credentials as JSON body to the n8n webhook
        // The n8n workflow extracts them from $json.body.customer_code / $json.body.security_token
        const response = await fetch(discoveryUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                customer_code,
                security_token,
            }),
        })

        const responseText = await response.text()
        console.log(`n8n response status: ${response.status}, length: ${responseText.length}`)

        let data
        try {
            data = JSON.parse(responseText)
        } catch (_e) {
            console.error('Failed to parse n8n response as JSON:', responseText.substring(0, 500))
            return new Response(JSON.stringify({
                error: 'n8n returned invalid JSON response',
                details: responseText.substring(0, 200)
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 502,
            })
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
        })

    } catch (error) {
        console.error('Proxy error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
