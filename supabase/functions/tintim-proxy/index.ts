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
        const { url, customer_code, security_token, method = 'GET' } = await req.json()

        if (!url) {
            return new Response(JSON.stringify({ error: 'URL is required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // Proxy request to the target URL
        // We append the parameters to the URL for discovery
        const targetUrl = new URL(url)
        if (customer_code) targetUrl.searchParams.set('customer_code', customer_code)
        if (security_token) targetUrl.searchParams.set('security_token', security_token)

        console.log(`Proxying ${method} request to: ${targetUrl.toString()}`)

        const response = await fetch(targetUrl.toString(), {
            method: method,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${security_token}`
            },
        })

        const data = await response.json()

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
