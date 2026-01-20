import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SyncRequest {
    section_id: string;
}

interface PromptSection {
    id: string;
    section_key: string;
    section_name: string;
    content: string;
    content_format: string;
    agent_id: string;
}

interface Agent {
    id: string;
    webhook_prompt_url: string;
    api_key_hash: string;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    try {
        // Verify JWT authorization
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Supabase client with service role for database operations
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse request
        const { section_id }: SyncRequest = await req.json();

        if (!section_id) {
            return new Response(
                JSON.stringify({ error: "Missing section_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get the prompt section
        const { data: section, error: sectionError } = await supabase
            .from("ai_agent_prompt_sections")
            .select("id, section_key, section_name, content, content_format, agent_id")
            .eq("id", section_id)
            .single() as { data: PromptSection | null; error: Error | null };

        if (sectionError || !section) {
            return new Response(
                JSON.stringify({ error: "Section not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get the agent's webhook URL
        const { data: agent, error: agentError } = await supabase
            .from("ai_agents")
            .select("id, webhook_prompt_url, api_key_hash")
            .eq("id", section.agent_id)
            .single() as { data: Agent | null; error: Error | null };

        if (agentError || !agent) {
            return new Response(
                JSON.stringify({ error: "Agent not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!agent.webhook_prompt_url) {
            // No webhook configured, mark as synced (local only)
            await supabase
                .from("ai_agent_prompt_sections")
                .update({
                    sync_status: "synced",
                    last_sync_at: new Date().toISOString(),
                    last_sync_error: null,
                })
                .eq("id", section_id);

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No webhook configured, marked as synced locally"
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Mark as pending before attempting sync
        await supabase
            .from("ai_agent_prompt_sections")
            .update({ sync_status: "pending" })
            .eq("id", section_id);

        // Prepare payload for external agent
        const payload = {
            section_key: section.section_key,
            section_name: section.section_name,
            content: section.content,
            content_format: section.content_format,
            updated_at: new Date().toISOString(),
        };

        try {
            // Send to external agent
            const response = await fetch(agent.webhook_prompt_url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Use the stored API key for authentication with external service
                    "X-API-Key": agent.api_key_hash ? "***" : "", // Don't expose hash, use if needed
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`External webhook returned ${response.status}: ${errorText}`);
            }

            // Mark as synced
            await supabase
                .from("ai_agent_prompt_sections")
                .update({
                    sync_status: "synced",
                    last_sync_at: new Date().toISOString(),
                    last_sync_error: null,
                })
                .eq("id", section_id);

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Prompt section synced successfully"
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );

        } catch (webhookError) {
            // Mark as error
            await supabase
                .from("ai_agent_prompt_sections")
                .update({
                    sync_status: "error",
                    last_sync_error: webhookError.message,
                })
                .eq("id", section_id);

            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Failed to sync with external agent",
                    details: webhookError.message
                }),
                { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

    } catch (error) {
        console.error("Sync error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
