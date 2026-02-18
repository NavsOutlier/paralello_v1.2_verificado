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
            // New: for confirming or canceling a pending payment
            action,
            pending_payment_id
        } = body;

        // =====================================================
        // ACTION: Confirm pending payment and activate org
        // =====================================================
        if (action === 'confirm_pending_payment' && pending_payment_id) {
            console.log(`Confirming pending payment: ${pending_payment_id}`);

            // Get the pending payment
            const { data: pendingPayment, error: pendingError } = await supabaseClient
                .from('pending_payments')
                .select('*')
                .eq('id', pending_payment_id)
                .single();

            if (pendingError || !pendingPayment) {
                return new Response(
                    JSON.stringify({ error: "Pending payment not found" }),
                    { status: 404, headers: corsHeaders }
                );
            }

            const orgId = pendingPayment.organization_id;
            if (!orgId) {
                return new Response(
                    JSON.stringify({ error: "No organization linked to this payment" }),
                    { status: 400, headers: corsHeaders }
                );
            }

            // 1. Update pending payment status
            await supabaseClient
                .from('pending_payments')
                .update({ status: 'completed' })
                .eq('id', pending_payment_id);

            // 2. Fetch Organization data for invitation
            const { data: org, error: fetchError } = await supabaseClient
                .from('organizations')
                .select('*')
                .eq('id', orgId)
                .single();

            if (fetchError || !org) {
                return new Response(JSON.stringify({ error: "Organization not found" }), { status: 404, headers: corsHeaders });
            }

            // 3. Invite User and Create Member (Now that they paid)
            let userId: string;
            const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(org.owner_email, {
                data: { full_name: org.owner_name }
            });

            if (inviteError) {
                // If user already exists, get their ID
                const { data: profile } = await supabaseClient.from('profiles').select('id').eq('email', org.owner_email).maybeSingle();
                if (!profile) {
                    console.error("Invite Error and Profile not found:", inviteError);
                    // We proceed anyway to update status, but log the error
                }
                userId = profile?.id;
            } else {
                userId = inviteData.user.id;
            }

            if (userId) {
                // Create/Upsert Profile
                await supabaseClient.from('profiles').upsert({ id: userId, name: org.owner_name, email: org.owner_email, organization_id: orgId });

                // Add Member record
                await supabaseClient.from("team_members").insert({
                    organization_id: orgId,
                    profile_id: userId,
                    role: "manager",
                    status: "active",
                    permissions: { all: true }
                });
            }

            // 4. Update organization status (Finalize activation)
            const { error: orgUpdateError } = await supabaseClient
                .from('organizations')
                .update({
                    status: 'trialing',
                    trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                })
                .eq('id', orgId);

            if (orgUpdateError) throw orgUpdateError;

            return new Response(
                JSON.stringify({ success: true, organizationId: orgId }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
        }

        // =====================================================
        // ACTION: Cancel pending payment and DELETE org
        // =====================================================
        if (action === 'cancel_pending_payment' && pending_payment_id) {
            console.log(`Canceling and cleaning up pending payment: ${pending_payment_id}`);

            const { data: pendingPayment } = await supabaseClient
                .from('pending_payments')
                .select('organization_id')
                .eq('id', pending_payment_id)
                .single();

            if (pendingPayment?.organization_id) {
                // Delete organization (cascades to members/pending_payments if configured, 
                // but let's be explicit if needed)
                console.log(`Deleting organization: ${pendingPayment.organization_id}`);
                await supabaseClient
                    .from('organizations')
                    .delete()
                    .eq('id', pendingPayment.organization_id);
            } else {
                // If org wasn't created yet or ref is missing
                await supabaseClient
                    .from('pending_payments')
                    .delete()
                    .eq('id', pending_payment_id);
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
                JSON.stringify({ error: "Missing required fields" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
        }

        // Billing info to store/send
        let paymentUrl = null;
        let asaasPaymentId = null;
        let asaasCustomerId = null;
        let asaasSubscriptionId = null;

        // If billing is activated, Call n8n FIRST to get Asaas data
        if (activate_billing) {
            console.log("Triggering n8n webhook BEFORE creating rows...");
            const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL_CREATE_CUSTOMER");

            if (n8nWebhookUrl) {
                try {
                    const response = await fetch(n8nWebhookUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            event: "initiate_org_creation",
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

                    console.log(`n8n response status: ${response.status}`);
                    if (response.ok) {
                        const res = await response.json();
                        console.log("n8n response body:", JSON.stringify(res));

                        // RESILIENT MAPPING: Handle nested structures (res[0].data[0] or similar)
                        const root = Array.isArray(res) ? res[0] : res;
                        const data = (root && root.data && Array.isArray(root.data)) ? root.data[0] : root;

                        paymentUrl = data.payment_url || data.invoiceUrl || data.url;
                        asaasPaymentId = data.asaas_payment_id || data.paymentId || data.id;
                        asaasCustomerId = data.asaas_customer_id || data.customerId || data.customer;
                        asaasSubscriptionId = data.asaas_subscription_id || data.subscriptionId || data.subscription;

                        console.log("Mapped IDs:", { asaasPaymentId, asaasCustomerId, asaasSubscriptionId, paymentUrl });
                    } else {
                        const errorText = await response.text();
                        console.error("n8n error body:", errorText);
                    }
                } catch (e) {
                    console.error("n8n fetch exception:", e);
                }
            } else {
                console.error("N8N_WEBHOOK_URL_CREATE_CUSTOMER is NOT set in environment variables!");
            }
        }

        // Create Org (Status depends on billing)
        const status = activate_billing ? 'pending_payment' : 'trialing';

        const orgData = {
            organization,
            owner_email,
            owner_name,
            plan,
            billing_document,
            billing_email,
            billing_phone,
            contracted_clients,
            max_users,
            billing_value,
            status
        };

        // Create the organization, members, and pending_payment record
        const result = await createOrganizationFromData(
            supabaseClient,
            orgData,
            corsHeaders,
            paymentUrl,
            asaasCustomerId,
            asaasSubscriptionId,
            asaasPaymentId
        );

        return result;

    } catch (error: any) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});

// =====================================================
// Helper: Create everything in DB
// =====================================================
async function createOrganizationFromData(
    supabaseClient: any,
    orgData: any,
    corsHeaders: any,
    paymentUrl: string | null,
    asaasCustomerId?: string | null,
    asaasSubscriptionId?: string | null,
    asaasPaymentId?: string | null
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
        billing_value,
        status
    } = orgData;

    // 1. Determine if we should Invite User Now
    let userId: string | null = null;

    // Only invite immediately if NOT pending payment (e.g., direct creation by superadmin)
    if (status !== 'pending_payment') {
        const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(owner_email, {
            data: { full_name: owner_name }
        });

        if (inviteError) {
            const { data: profile } = await supabaseClient.from('profiles').select('id').eq('email', owner_email).maybeSingle();
            if (!profile) throw new Error(`User creation failed: ${inviteError.message}`);
            userId = profile.id;
        } else {
            userId = inviteData.user.id;
        }

        // Upsert Profile
        await supabaseClient.from('profiles').upsert({ id: userId, name: owner_name, email: owner_email });
    }

    // 2. Create Organization
    const { data: newOrg, error: orgError } = await supabaseClient
        .from("organizations")
        .insert({
            name: organization.name,
            slug: organization.slug,
            plan: plan,
            status: status,
            owner_name: owner_name,
            owner_email: owner_email,
            billing_document: billing_document,
            billing_email: billing_email,
            billing_phone: billing_phone,
            contracted_clients: contracted_clients,
            max_users: max_users,
            billing_value: billing_value || 0,
            asaas_customer_id: asaasCustomerId,
            asaas_subscription_id: asaasSubscriptionId,
            trial_ends_at: status === 'trialing' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            current_period_end: status === 'trialing' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        })
        .select()
        .single();

    if (orgError) throw orgError;

    // 3. Add Member (Only if user was created/invited)
    if (userId) {
        await supabaseClient.from("team_members").insert({
            organization_id: newOrg.id,
            profile_id: userId,
            role: "manager",
            status: "active",
            permissions: { all: true }
        });

        // Update profile linkage
        await supabaseClient.from('profiles').update({ organization_id: newOrg.id }).eq('id', userId).is('organization_id', null);
    }

    // 5. Create Pending Payment if needed
    let pendingPaymentId = null;
    if (status === 'pending_payment') {
        const { data: pending } = await supabaseClient
            .from('pending_payments')
            .insert({
                organization_id: newOrg.id,
                payment_url: paymentUrl,
                asaas_payment_id: asaasPaymentId,
                asaas_subscription_id: asaasSubscriptionId,
                asaas_customer_id: asaasCustomerId,
                status: 'pending'
            })
            .select()
            .single();
        pendingPaymentId = pending?.id;
    }

    return new Response(
        JSON.stringify({
            organizationId: newOrg.id,
            pending_payment_id: pendingPaymentId,
            payment_url: paymentUrl
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
}
