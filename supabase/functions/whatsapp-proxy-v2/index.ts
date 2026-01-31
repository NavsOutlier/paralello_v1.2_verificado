import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { action, organization_id } = body;

        // Get the n8n webhook URL from Supabase secrets
        const n8nManagerUrl = Deno.env.get("ENV_N8N_MANAGER_URL");
        if (!n8nManagerUrl) {
            throw new Error("ENV_N8N_MANAGER_URL not configured");
        }

        // Validate auth (extract JWT from Authorization header)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing Authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Supabase client to validate the user
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Validate JWT and get user
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid or expired token" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if user is super admin and get their organization_id
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_super_admin, organization_id")
            .eq("id", user.id)
            .single();

        const isSuperAdmin = profile?.is_super_admin || false;
        const userOrgId = profile?.organization_id;

        // Validation strategy
        if (!isSuperAdmin) {
            // For non-super admins, validate organization membership
            // Using profiles table as it contains organization_id
            if (userOrgId !== organization_id) {
                console.error(`[whatsapp-proxy-v2] Access denied: User ${user.email} (Org: ${userOrgId}) is not authorized for organization ${organization_id}`);
                return new Response(
                    JSON.stringify({ error: "Not authorized for this organization" }),
                    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // Special handling for delete_organization_instances
        if (action === "delete_organization_instances") {
            if (!isSuperAdmin) {
                return new Response(
                    JSON.stringify({ error: "Super Admin privileges required for global cleanup" }),
                    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            body.uazapi_global_key = Deno.env.get("UAZAPI_GLOBAL_KEY");
        }

        // Forward request to n8n webhook
        console.log(`[whatsapp-proxy-v2] Forwarding action: ${action} for Org: ${organization_id} (User: ${user.email})`);
        const n8nResponse = await fetch(n8nManagerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...body,
                user_id: user.id,
                user_email: user.email,
                is_super_admin: isSuperAdmin
            }),
        });

        const n8nResult = await n8nResponse.json();

        // Return n8n response to client
        return new Response(JSON.stringify(n8nResult), {
            status: n8nResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("[whatsapp-proxy-v2] Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
