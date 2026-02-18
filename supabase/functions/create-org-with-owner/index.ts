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

            // 2. Update organization status (Finalize activation)
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

                    if (response.ok) {
                        const res = await response.json();
                        paymentUrl = res.payment_url || res.invoiceUrl;
                        asaasPaymentId = res.asaas_payment_id || res.paymentId;
                        asaasCustomerId = res.asaas_customer_id || res.customerId;
                        asaasSubscriptionId = res.asaas_subscription_id || res.subscriptionId;
                    }
                } catch (e) {
                    console.error("n8n call failed:", e);
                    // We continue anyway, but it might fail later? 
                    // User said: "cria a na nova organização com dados recebidos do asaas"
                }
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

    // 1. Ensure User/Profile
    let userId: string;
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
            // If activating now, set dates
            trial_ends_at: status === 'trialing' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            current_period_end: status === 'trialing' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        })
        .select()
        .single();

    if (orgError) throw orgError;

    // 3. Add Member
    await supabaseClient.from("team_members").insert({
        organization_id: newOrg.id,
        profile_id: userId,
        role: "manager",
        status: "active",
        permissions: { all: true } // Simplified for brevity
    });

    // 4. Update profile linkage
    await supabaseClient.from('profiles').update({ organization_id: newOrg.id }).eq('id', userId).is('organization_id', null);

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
