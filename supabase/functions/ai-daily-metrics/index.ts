import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Simplified Daily Metrics Webhook
 * 
 * Payload (all fields optional except date):
 * {
 *   "date": "2026-01-19",
 *   "conversations": 45,
 *   "messages_sent": 320,
 *   "escalated": 3,
 *   "tokens_in": 45000,
 *   "tokens_out": 28000,
 *   "funnel": {
 *     "total": 120,
 *     "existing_patient": 35,
 *     "new_interested": 85,
 *     "qualified": 60,
 *     "scheduled": 45,
 *     "disqualified": 15,
 *     "no_response": 10
 *   }
 * }
 */

interface FunnelData {
    total?: number;
    existing_patient?: number;
    new_interested?: number;
    qualified?: number;
    scheduled?: number;
    disqualified?: number;
    no_response?: number;
    lost?: number;
}

interface DailyMetricsPayload {
    date: string;
    conversations?: number;
    messages_sent?: number;
    escalated?: number;
    abandoned?: number;
    total_response_time_ms?: number;
    tokens_in?: number;
    tokens_out?: number;
    funnel?: FunnelData;
    system_metrics?: Record<string, any>;
    evaluator_metrics?: Record<string, any>;
}

// Token pricing (USD) - GPT-4 approximation
const TOKEN_PRICE_INPUT = 0.00001;   // $0.01 per 1K tokens
const TOKEN_PRICE_OUTPUT = 0.00003;  // $0.03 per 1K tokens
const USD_TO_BRL = 5.5;              // Exchange rate

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
                JSON.stringify({ error: "Missing API key. Use header 'X-API-Key' or 'Authorization: Bearer <key>'" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const payload: DailyMetricsPayload = await req.json();

        // Validate date
        if (!payload.date) {
            return new Response(
                JSON.stringify({ error: "Missing 'date' field (format: YYYY-MM-DD)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(payload.date)) {
            return new Response(
                JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Find agent by API key hash
        const hashedKey = await hashApiKey(apiKey);
        console.log("DEBUG: Received Key:", apiKey);
        console.log("DEBUG: Computed Hash:", hashedKey);

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

        // Extract raw metrics with defaults
        const conversations = payload.conversations ?? 0;
        const messagesSent = payload.messages_sent ?? 0;
        const escalated = payload.escalated ?? 0;
        const abandoned = payload.abandoned ?? 0;
        const totalResponseTimeMs = payload.total_response_time_ms ?? 0;
        const tokensIn = payload.tokens_in ?? 0;
        const tokensOut = payload.tokens_out ?? 0;

        // Extract funnel data
        const funnel = payload.funnel ?? {};
        const system_metrics = payload.system_metrics ?? {};
        const evaluator_metrics = payload.evaluator_metrics ?? {};

        // Calculate derived metrics
        const resolved = Math.max(0, conversations - escalated - abandoned);
        const avgResponseTimeSec = messagesSent > 0 ? (totalResponseTimeMs / messagesSent) / 1000 : null;
        const messagesPerConversation = conversations > 0 ? messagesSent / conversations : null;
        const estimatedCostBrl = (tokensIn * TOKEN_PRICE_INPUT + tokensOut * TOKEN_PRICE_OUTPUT) * USD_TO_BRL;

        // Prepare metrics data
        const metricsData = {
            agent_id: agent.id,
            metric_date: payload.date,
            metric_hour: null, // Daily aggregate
            // Raw metrics
            total_conversations: conversations,
            active_conversations: 0,
            resolved_conversations: resolved,
            escalated_conversations: escalated,
            abandoned_conversations: abandoned,
            total_messages: messagesSent,
            tokens_input: tokensIn,
            tokens_output: tokensOut,
            // Calculated metrics
            avg_response_time: avgResponseTimeSec,
            avg_resolution_time: null,
            min_response_time: null,
            max_response_time: null,
            avg_csat_score: null,
            csat_responses: 0,
            fallback_count: 0,
            messages_per_conversation: messagesPerConversation,
            estimated_cost_brl: estimatedCostBrl,
            channel_breakdown: {},
            // Funnel metrics
            funnel_total: funnel.total ?? 0,
            funnel_existing_patient: funnel.existing_patient ?? 0,
            funnel_new_interested: funnel.new_interested ?? 0,
            funnel_qualified: funnel.qualified ?? 0,
            funnel_scheduled: funnel.scheduled ?? 0,
            funnel_disqualified: funnel.disqualified ?? 0,
            funnel_no_response: funnel.no_response ?? 0,
            funnel_lost: funnel.lost ?? 0,
            // Deep Metrics
            system_metrics: system_metrics,
            evaluator_metrics: evaluator_metrics
        };

        // Upsert metrics
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

        // Return success with calculated metrics
        return new Response(
            JSON.stringify({
                success: true,
                agent: agent.name,
                date: payload.date,
                saved: {
                    conversations,
                    messages_sent: messagesSent,
                    resolved,
                    escalated,
                    abandoned,
                    avg_response_time_sec: avgResponseTimeSec?.toFixed(2),
                    messages_per_conversation: messagesPerConversation?.toFixed(1),
                    estimated_cost_brl: estimatedCostBrl.toFixed(2),
                },
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

async function hashApiKey(apiKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
