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

        const body = await req.json();
        const {
            organization,
            owner_email,
            owner_name,
            plan,
            billing_document,
            billing_email,
            billing_phone,
            activate_billing,
            contracted_clients,
            max_users,
            billing_value,
            // New: for confirming a pending payment
            action,
            pending_payment_id
        } = body;

        // =====================================================
        // ACTION: Confirm pending payment and create org
        // =====================================================
        if (action === 'confirm_pending_payment' && pending_payment_id) {
            console.log(`Confirming pending payment: ${pending_payment_id}`);

            // Get the pending payment
            const { data: pendingPayment, error: pendingError } = await supabaseClient
                .from('pending_payments')
                .select('*')
                .eq('id', pending_payment_id)
                .eq('status', 'confirmed')
                .single();

            if (pendingError || !pendingPayment) {
                return new Response(
                    JSON.stringify({ error: "Pending payment not found or not confirmed" }),
                    { status: 400, headers: corsHeaders }
                );
            }

            // Extract org data and Asaas IDs from pending payment
            const orgData = pendingPayment.org_data;
            const asaasCustomerId = pendingPayment.asaas_customer_id;
            const asaasSubscriptionId = pendingPayment.asaas_subscription_id;

            // Now create the actual organization using the stored data
            return await createOrganizationFromData(
                supabaseClient,
                orgData,
                corsHeaders,
                pendingPayment.id,
                asaasCustomerId,
                asaasSubscriptionId
            );
        }

        // =====================================================
        // ACTION: Cancel pending payment
        // =====================================================
        if (action === 'cancel_pending_payment' && pending_payment_id) {
            console.log(`Canceling pending payment: ${pending_payment_id}`);

            const { error } = await supabaseClient
                .from('pending_payments')
                .update({ status: 'canceled' })
                .eq('id', pending_payment_id);

            if (error) {
                return new Response(
                    JSON.stringify({ error: "Failed to cancel pending payment" }),
                    { status: 400, headers: corsHeaders }
                );
            }

            return new Response(
                JSON.stringify({ success: true }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
        }

        // =====================================================
        // NORMAL FLOW: Create org (with or without billing)
        // =====================================================
        if (!organization?.name || !organization?.slug || !owner_email || !owner_name || !plan) {
            return new Response(
                JSON.stringify({ error: "Missing required fields (name, slug, owner_email, owner_name, plan)" }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400,
                }
            );
        }

        // If billing is activated, create a pending payment first
        if (activate_billing) {
            console.log("Creating pending payment for billing activation flow...");

            // Store all org data for later creation
            const orgDataToStore = {
                organization,
                owner_email,
                owner_name,
                plan,
                billing_document,
                billing_email,
                billing_phone,
                contracted_clients,
                max_users,
                billing_value
            };

            // Get the authenticated user ID (caller)
            const authHeader = req.headers.get('Authorization');
            let createdBy = null;
            if (authHeader) {
                try {
                    const token = authHeader.replace('Bearer ', '');
                    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
                    if (!userError && user) {
                        createdBy = user.id;
                    } else {
                        console.warn("Could not validate user from token:", userError);
                    }
                } catch (e) {
                    console.warn("Error parsing auth header:", e);
                }
            }

            // Create pending payment record
            // Use service role client for this operation to avoid RLS issues if auth fails
            const { data: pendingPayment, error: pendingError } = await supabaseClient
                .from('pending_payments')
                .insert({
                    org_data: orgDataToStore,
                    status: 'pending',
                    created_by: createdBy
                })
                .select()
                .single();

            if (pendingError) {
                console.error("Failed to create pending payment:", pendingError);
                return new Response(
                    JSON.stringify({
                        error: "Failed to create pending payment",
                        details: pendingError,
                        payload_sent: orgDataToStore
                    }),
                    { status: 400, headers: corsHeaders }
                );
            }

            // Now call n8n to create the Asaas customer and payment
            const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL_CREATE_CUSTOMER");
            let paymentUrl = null;
            let asaasPaymentId = null;
            let asaasCustomerId = null;

            if (n8nWebhookUrl) {
                try {
                    console.log(`Triggering n8n webhook for pending payment: ${pendingPayment.id}`);
                    const response = await fetch(n8nWebhookUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            event: "create_pending_payment",
                            pending_payment_id: pendingPayment.id,
                            organization: {
                                name: organization.name,
                                slug: organization.slug,
                                billing_document: billing_document,
                                billing_email: billing_email,
                                billing_phone: billing_phone,
                                owner_name: owner_name,
                                owner_email: owner_email,
                                contracted_clients: contracted_clients,
                                billing_value: billing_value,
                                max_users: max_users
                            },
                            plan: plan
                        }),
                    });

                    if (response.ok) {
                        const webhookResult = await response.json();
                        console.log("n8n webhook response:", webhookResult);

                        paymentUrl = webhookResult.payment_url || webhookResult.invoiceUrl || null;
                        asaasPaymentId = webhookResult.asaas_payment_id || webhookResult.paymentId || null;
                        asaasCustomerId = webhookResult.asaas_customer_id || webhookResult.customerId || null;
                        const asaasSubscriptionId = webhookResult.asaas_subscription_id || webhookResult.subscriptionId || null;

                        // Update pending payment with Asaas info
                        if (paymentUrl || asaasPaymentId || asaasSubscriptionId) {
                            await supabaseClient
                                .from('pending_payments')
                                .update({
                                    payment_url: paymentUrl,
                                    asaas_payment_id: asaasPaymentId,
                                    asaas_subscription_id: asaasSubscriptionId,
                                    asaas_customer_id: asaasCustomerId
                                })
                                .eq('id', pendingPayment.id);
                        }
                    } else {
                        console.error(`n8n Webhook error: ${response.status}`);
                    }
                } catch (webhookError: any) {
                    console.error("n8n webhook error:", webhookError.message);
                }
            }

            // Return the pending payment info to frontend
            return new Response(
                JSON.stringify({
                    pending_payment_id: pendingPayment.id,
                    payment_url: paymentUrl,
                    status: 'pending'
                }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                }
            );
        }

        // =====================================================
        // NO BILLING: Create org directly (original flow)
        // =====================================================
        const orgDataForDirect = {
            organization,
            owner_email,
            owner_name,
            plan,
            billing_document,
            billing_email,
            billing_phone,
            contracted_clients,
            max_users,
            billing_value
        };

        return await createOrganizationFromData(supabaseClient, orgDataForDirect, corsHeaders, null);

    } catch (error: any) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message, details: error }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});

// =====================================================
// Helper: Create organization from stored data
// =====================================================
async function createOrganizationFromData(
    supabaseClient: any,
    orgData: any,
    corsHeaders: any,
    pendingPaymentId: string | null,
    asaasCustomerId?: string | null,
    asaasSubscriptionId?: string | null
) {
    const {
        organization,
        owner_email,
        owner_name,
        plan,
        billing_document,
        billing_email,
        billing_phone,
        contracted_clients,
        max_users,
        billing_value
    } = orgData;

    // 1. Ensure User exists and is invited
    let userId: string;

    const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(owner_email, {
        data: { full_name: owner_name }
    });

    if (inviteError) {
        console.error("Invite error:", inviteError);
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('email', owner_email)
            .maybeSingle();

        if (profile) {
            userId = profile.id;
        } else {
            throw new Error(`Could not create or find user: ${inviteError.message}`);
        }
    } else {
        userId = inviteData.user.id;
    }

    // 2. Ensure Profile exists
    const { data: existingProfile } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

    if (existingProfile) {
        await supabaseClient
            .from('profiles')
            .update({ name: owner_name, email: owner_email })
            .eq('id', userId);
    } else {
        await supabaseClient
            .from('profiles')
            .insert({ id: userId, name: owner_name, email: owner_email });
    }

    // 3. Create Organization
    const { data: newOrg, error: orgError } = await supabaseClient
        .from("organizations")
        .insert({
            name: organization.name,
            slug: organization.slug,
            plan: plan,
            status: "trialing", // Start as trialing (30-day money back guarantee period)
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Paid for the first month
            owner_name: owner_name,
            owner_email: owner_email,
            billing_document: billing_document,
            billing_email: billing_email,
            billing_phone: billing_phone,
            contracted_clients: contracted_clients,
            max_users: max_users,
            billing_value: billing_value || 0,
            asaas_customer_id: asaasCustomerId,
            asaas_subscription_id: asaasSubscriptionId
        })
        .select()
        .single();

    if (orgError) throw orgError;

    // 4. Add Member (Owner)
    const { error: memberError } = await supabaseClient
        .from("team_members")
        .insert({
            organization_id: newOrg.id,
            profile_id: userId,
            role: "manager",
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
        await supabaseClient.from("organizations").delete().eq("id", newOrg.id);
        throw new Error(`Failed to add owner to team: ${memberError.message}`);
    }

    // 5. Update profile organization_id
    await supabaseClient
        .from('profiles')
        .update({ organization_id: newOrg.id })
        .eq('id', userId)
        .is('organization_id', null);

    // 6. Update the pending payment instead of deleting it
    if (pendingPaymentId) {
        await supabaseClient
            .from('pending_payments')
            .update({
                status: 'completed',
                organization_id: newOrg.id
            })
            .eq('id', pendingPaymentId);
    }

    return new Response(
        JSON.stringify({ organizationId: newOrg.id }),
        {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        }
    );
}
