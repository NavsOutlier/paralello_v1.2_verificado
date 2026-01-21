
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ConversationUpdatePayload {
    contact_identifier: string; // Phone or Email
    contact_name?: string;
    contact_phone?: string;
    status: string; // new, interested, qualified, scheduled, patient, no_response, disqualified
    summary?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    sentiment_score?: number;
    session_metrics?: Record<string, any>;
    resolution_reason?: string;
    messages?: {
        role: 'user' | 'assistant' | 'system' | 'tool';
        content: string;
        tokens_used?: number;
        metadata?: Record<string, any>;
    }[];
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
        const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "Missing API key" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const payload: ConversationUpdatePayload = await req.json();

        if (!payload.contact_identifier || !payload.status) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: contact_identifier, status" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Find agent by API key hash
        const hashedKey = await hashApiKey(apiKey);
        const { data: agent, error: agentError } = await supabase
            .from("ai_agents")
            .select("id, name")
            .eq("api_key_hash", hashedKey)
            .eq("is_active", true)
            .single();

        if (agentError || !agent) {
            return new Response(
                JSON.stringify({ error: "Invalid API key or agent not found/inactive" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check for manual override
        const { data: existing } = await supabase
            .from("ai_conversations")
            .select("id, is_manual_override")
            .eq("agent_id", agent.id)
            .eq("contact_identifier", payload.contact_identifier)
            .single();

        if (existing?.is_manual_override) {
            return new Response(
                JSON.stringify({
                    success: true,
                    skipped: true,
                    message: "Manual override active. Update ignored.",
                    id: existing.id
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Upsert conversation data
        const convData = {
            agent_id: agent.id,
            contact_identifier: payload.contact_identifier,
            status: payload.status,
            ...(payload.contact_name && { contact_name: payload.contact_name }),
            ...(payload.contact_phone && { contact_phone: payload.contact_phone }),
            ...(payload.summary && { summary: payload.summary }),
            ...(payload.sentiment && { sentiment: payload.sentiment }),
            ...(payload.sentiment_score !== undefined && { sentiment_score: payload.sentiment_score }),
            ...(payload.session_metrics && { session_metrics: payload.session_metrics }),
            ...(payload.resolution_reason && { resolution_reason: payload.resolution_reason }),
            last_interaction_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from("ai_conversations")
            .upsert(convData, {
                onConflict: "agent_id,contact_identifier"
            })
            .select()
            .single();

        if (error) {
            console.error("Upsert error:", error);
            return new Response(
                JSON.stringify({ error: "Failed to update conversation", details: error.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // If messages are provided, log them
        if (payload.messages && payload.messages.length > 0) {
            const messageLogs = payload.messages.map(msg => ({
                conversation_id: data.id,
                role: msg.role,
                content: msg.content,
                tokens_used: msg.tokens_used || 0,
                metadata: msg.metadata || {}
            }));

            const { error: msgError } = await supabase
                .from("ai_conversation_messages")
                .insert(messageLogs);

            if (msgError) {
                console.error("Error logging messages:", msgError);
                // We don't fail the whole request since status was updated
            }
        }

        return new Response(
            JSON.stringify({ success: true, conversation_id: data.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Webhook internal error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

async function hashApiKey(apiKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
