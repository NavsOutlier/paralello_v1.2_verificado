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
        const { customer_code, security_token, method = 'GET' } = body

        // Prioritize URL from environment secret for better security
        const envUrl = Deno.env.get('TINTIM_DISCOVERY_URL')
        const requestUrl = body.url || envUrl

        if (!requestUrl) {
            return new Response(JSON.stringify({ error: 'URL is required (not found in body or environment)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // Proxy request to the target URL
        const targetUrl = new URL(requestUrl)
        if (customer_code) targetUrl.searchParams.set('customer_code', customer_code)
        if (security_token) targetUrl.searchParams.set('security_token', security_token)

        console.log(`Proxying ${method} request to: ${targetUrl.hostname}...`)

        const response = await fetch(targetUrl.toString(), {
            method: method,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${security_token}`
            },
        })

        const responseText = await response.text()
        let data
        try {
            data = JSON.parse(responseText)
        } catch (e) {
            console.error('Failed to parse response as JSON:', responseText.substring(0, 500))
            return new Response(JSON.stringify({
                error: 'Target returned invalid JSON',
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
