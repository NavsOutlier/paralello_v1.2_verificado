import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        const { organization, owner_email, owner_name, plan } = await req.json();

        if (!organization?.name || !organization?.slug || !owner_email || !owner_name || !plan) {
            return new Response(
                JSON.stringify({ error: "Missing required fields (name, slug, owner_email, owner_name, plan)" }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400,
                }
            );
        }

        // 1. Ensure User exists and is invited (to trigger email notification)
        let userId: string;

        // Try to invite the user - this sends an email if they don't exist
        // and returns the user if they already do.
        const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(owner_email, {
            data: { full_name: owner_name }
        });

        if (inviteError) {
            console.error("Invite error:", inviteError);
            // If invite fails, they might already be a user. Try to find them.
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('email', owner_email)
                .maybeSingle();

            if (profile) {
                userId = profile.id;
            } else {
                return new Response(
                    JSON.stringify({ error: `Could not create or find user: ${inviteError.message}` }),
                    { status: 400, headers: corsHeaders }
                );
            }
        } else {
            userId = inviteData.user.id;
        }

        // 2. Ensure Profile exists and is updated
        // Table: profiles (id, name, email, ...)
        const { data: existingProfile, error: checkError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (checkError) {
            console.error("Profile check error:", checkError);
            throw new Error(`Failed to check profile: ${checkError.message}`);
        }

        if (existingProfile) {
            const { error: updateError } = await supabaseClient
                .from('profiles')
                .update({
                    name: owner_name,
                    email: owner_email,
                })
                .eq('id', userId);

            if (updateError) {
                console.error("Profile update error:", updateError);
                throw new Error(`Failed to update profile: ${updateError.message}`);
            }
        } else {
            const { error: insertError } = await supabaseClient
                .from('profiles')
                .insert({
                    id: userId,
                    name: owner_name,
                    email: owner_email,
                });

            if (insertError) {
                console.error("Profile insert error:", insertError);
                throw new Error(`Failed to insert profile: ${insertError.message}`);
            }
        }

        // 3. Create Organization
        const { data: orgData, error: orgError } = await supabaseClient
            .from("organizations")
            .insert({
                name: organization.name,
                slug: organization.slug,
                plan: plan,
                status: "active",
                owner_name: owner_name,
                owner_email: owner_email,
            })
            .select()
            .single();

        if (orgError) throw orgError;

        // 4. Add Member (Owner)
        // Table: team_members (not organization_members)
        // Columns: organization_id, profile_id (not user_id), role, status, permissions
        const { error: memberError } = await supabaseClient
            .from("team_members")
            .insert({
                organization_id: orgData.id,
                profile_id: userId,
                role: "manager", // Highest role available
                status: "active",
                job_title: "Owner",
                permissions: {
                    can_manage_clients: true,
                    can_manage_tasks: true,
                    can_manage_team: true,
                    can_manage_marketing: true,
                    can_manage_automation: true,
                    can_manage_ai_agents: true
                }
            });

        if (memberError) {
            console.error("Member insert error:", memberError);
            // Clean up org?
            await supabaseClient.from("organizations").delete().eq("id", orgData.id);
            throw new Error(`Failed to add owner to team: ${memberError.message}`);
        }

        // Optional: Update profile organization_id to this new one?
        // Only if they don't have one?
        await supabaseClient
            .from('profiles')
            .update({ organization_id: orgData.id })
            .eq('id', userId)
            .is('organization_id', null);

        return new Response(
            JSON.stringify({ organizationId: orgData.id }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message, details: error }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
