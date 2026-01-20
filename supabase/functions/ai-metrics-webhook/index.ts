import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface MetricsPayload {
    client_ref?: string; // External client reference
    agent_id?: string; // Direct agent UUID
    metrics: {
        total_conversations?: number;
        active_conversations?: number;
        resolved_conversations?: number;
        escalated_conversations?: number;
        abandoned_conversations?: number;
        avg_response_time?: number; // in seconds
        avg_resolution_time?: number; // in seconds
        min_response_time?: number;
        max_response_time?: number;
        avg_csat_score?: number;
        csat_responses?: number;
        fallback_count?: number;
        total_messages?: number;
        messages_per_conversation?: number;
        tokens_input?: number;
        tokens_output?: number;
        estimated_cost_brl?: number;
        channel_breakdown?: Record<string, number>;
    };
    period: "hourly" | "daily";
    timestamp: string; // ISO 8601
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
        // Get API key from header
        const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "Missing API key" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const payload: MetricsPayload = await req.json();

        // Validate required fields
        if (!payload.metrics) {
            return new Response(
                JSON.stringify({ error: "Missing metrics object" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!payload.period) {
            return new Response(
                JSON.stringify({ error: "Missing period (hourly or daily)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!payload.timestamp) {
            return new Response(
                JSON.stringify({ error: "Missing timestamp" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Supabase client with service role
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Find the agent by API key hash or agent_id
        let agentId = payload.agent_id;

        if (!agentId) {
            // Look up agent by hashed API key
            const { data: agent, error: agentError } = await supabase
                .from("ai_agents")
                .select("id")
                .eq("api_key_hash", await hashApiKey(apiKey))
                .eq("is_active", true)
                .single();

            if (agentError || !agent) {
                return new Response(
                    JSON.stringify({ error: "Invalid API key or agent not found" }),
                    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            agentId = agent.id;
        }

        // Parse timestamp
        const timestamp = new Date(payload.timestamp);
        const metricDate = timestamp.toISOString().split("T")[0];
        const metricHour = payload.period === "hourly" ? timestamp.getUTCHours() : null;

        // Prepare metrics data
        const metricsData = {
            agent_id: agentId,
            metric_date: metricDate,
            metric_hour: metricHour,
            total_conversations: payload.metrics.total_conversations ?? 0,
            active_conversations: payload.metrics.active_conversations ?? 0,
            resolved_conversations: payload.metrics.resolved_conversations ?? 0,
            escalated_conversations: payload.metrics.escalated_conversations ?? 0,
            abandoned_conversations: payload.metrics.abandoned_conversations ?? 0,
            avg_response_time: payload.metrics.avg_response_time,
            avg_resolution_time: payload.metrics.avg_resolution_time,
            min_response_time: payload.metrics.min_response_time,
            max_response_time: payload.metrics.max_response_time,
            avg_csat_score: payload.metrics.avg_csat_score,
            csat_responses: payload.metrics.csat_responses ?? 0,
            fallback_count: payload.metrics.fallback_count ?? 0,
            total_messages: payload.metrics.total_messages ?? 0,
            messages_per_conversation: payload.metrics.messages_per_conversation,
            tokens_input: payload.metrics.tokens_input ?? 0,
            tokens_output: payload.metrics.tokens_output ?? 0,
            estimated_cost_brl: payload.metrics.estimated_cost_brl ?? 0,
            channel_breakdown: payload.metrics.channel_breakdown ?? {},
        };

        // Upsert metrics (update if exists, insert if not)
        const { data, error } = await supabase
            .from("ai_agent_metrics")
            .upsert(metricsData, {
                onConflict: "agent_id,metric_date,metric_hour",
            })
            .select()
            .single();

        if (error) {
            console.error("Error upserting metrics:", error);
            return new Response(
                JSON.stringify({ error: "Failed to save metrics", details: error.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Metrics saved successfully",
                metric_id: data.id
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );

    } catch (error) {
        console.error("Webhook error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

// Simple hash function for API key verification
async function hashApiKey(apiKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
