import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        const { organization_id } = await req.json();

        if (!organization_id) {
            throw new Error("Missing organization_id");
        }

        console.log(`[cleanup-org-auth] Starting cleanup for Org: ${organization_id}`);

        // 1. Get all members linked to this organization
        const { data: members, error: membersError } = await supabaseAdmin
            .from('team_members')
            .select('profile_id')
            .eq('organization_id', organization_id);

        if (membersError) throw membersError;

        if (!members || members.length === 0) {
            console.log("[cleanup-org-auth] No members found for this organization.");
            return new Response(JSON.stringify({ success: true, message: "No members to clean up" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const stats = { Deleted: 0, Kept: 0, Errors: 0 };

        // 2. Process each member
        for (const member of members) {
            const profileId = member.profile_id;

            // Check if this user belongs to any OTHER organization
            const { count, error: countError } = await supabaseAdmin
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('profile_id', profileId);

            if (countError) {
                console.error(`[cleanup-org-auth] Error checking memberships for ${profileId}:`, countError);
                stats.Errors++;
                continue;
            }

            // If count is 1, they only belong to the organization being deleted
            if (count === 1) {
                console.log(`[cleanup-org-auth] User ${profileId} has only this membership. Deleting from Auth.`);

                // Extra safety: Don't delete Super Admins
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('is_super_admin')
                    .eq('id', profileId)
                    .single();

                if (profile?.is_super_admin) {
                    console.log(`[cleanup-org-auth] Skipping Super Admin user: ${profileId}`);
                    stats.Kept++;
                    continue;
                }

                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(profileId);

                if (deleteError) {
                    console.error(`[cleanup-org-auth] Failed to delete user ${profileId}:`, deleteError.message);
                    stats.Errors++;
                } else {
                    stats.Deleted++;
                }
            } else {
                console.log(`[cleanup-org-auth] User ${profileId} has ${count} memberships. Keeping Auth account.`);
                stats.Kept++;
            }
        }

        console.log(`[cleanup-org-auth] Cleanup finished:`, stats);

        return new Response(JSON.stringify({ success: true, stats }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("[cleanup-org-auth] Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
