import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
            action,
            pending_payment_id
        } = body;

        console.log(`Received request: action=${action}, email=${owner_email}, org=${organization?.slug}`);

        // =====================================================
        // ACTION: Confirm payment and ACTIVATE
        // =====================================================
        if (action === 'confirm_pending_payment' && pending_payment_id) {
            console.log(`Confirming payment for ID: ${pending_payment_id}`);

            const { data: pendingPayment, error: pendingError } = await supabaseClient
                .from('pending_payments')
                .select('*, organizations(*)')
                .eq('id', pending_payment_id)
                .single();

            if (pendingError || !pendingPayment) {
                return new Response(JSON.stringify({ error: "Pending payment not found" }), { status: 404, headers: corsHeaders });
            }

            const orgId = pendingPayment.organization_id;
            const email = pendingPayment.organizations.owner_email;

            // 1. Update status
            await supabaseClient.from('pending_payments').update({ status: 'completed' }).eq('id', pending_payment_id);
            await supabaseClient.from('organizations').update({
                status: 'trialing',
                trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }).eq('id', orgId);

            // 2. NOW send the invite email (since they paid)
            console.log(`Sending invitation to ${email}`);
            const { error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email);

            if (inviteError) {
                console.warn("Invite email failed (user might already be invited), but org is active:", inviteError.message);
            }

            return new Response(JSON.stringify({ success: true, organizationId: orgId }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200
            });
        }

        // =====================================================
        // ACTION: Cancel and CLEANUP
        // =====================================================
        if (action === 'cancel_pending_payment' && pending_payment_id) {
            console.log(`Canceling and CLEANING UP: ${pending_payment_id}`);

            const { data: pending } = await supabaseClient
                .from('pending_payments')
                .select('organization_id, organizations(owner_email)')
                .eq('id', pending_payment_id)
                .single();

            if (pending?.organization_id) {
                const orgId = pending.organization_id;
                const email = pending.organizations?.owner_email;

                // 1. Delete Organization (cascades to members and pending_payments)
                await supabaseClient.from('organizations').delete().eq('id', orgId);

                // 2. Cleanup Auth User if they were JUST created for this org
                if (email) {
                    const { data: authUser } = await supabaseClient.auth.admin.getUserByEmail(email);
                    if (authUser?.user) {
                        // Only delete if they haven't confirmed their email/logged in yet
                        if (!authUser.user.email_confirmed_at) {
                            console.log(`Cleaning up unconfirmed auth user: ${email}`);
                            await supabaseClient.auth.admin.deleteUser(authUser.user.id);
                        }
                    }
                }
            }

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // =====================================================
        // NORMAL FLOW: Initiation
        // =====================================================
        if (!organization?.slug || !owner_email) {
            return new Response(JSON.stringify({ error: "Missing slug or email" }), { status: 400, headers: corsHeaders });
        }

        // 1. Pre-validation
        const { data: existingOrg } = await supabaseClient.from('organizations').select('id').eq('slug', organization.slug).maybeSingle();
        if (existingOrg) throw new Error("Este slug já está em uso.");

        // 2. n8n Call (Required for billing flow)
        let paymentUrl = null;
        let asaasIds = { paymentId: null, customerId: null, subscriptionId: null };

        if (activate_billing) {
            const n8nUrl = Deno.env.get("N8N_WEBHOOK_URL_CREATE_CUSTOMER");
            if (!n8nUrl) throw new Error("Webhook de cobrança não configurado.");

            const n8nResponse = await fetch(n8nUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event: "initiate_org_creation",
                    organization: { ...organization, owner_email, owner_name, billing_document, billing_email, billing_phone, contracted_clients, billing_value },
                    plan
                })
            });

            if (!n8nResponse.ok) throw new Error("Falha ao gerar link de pagamento no n8n.");

            const rawRes = await n8nResponse.json();
            const res = Array.isArray(rawRes) ? rawRes[0] : rawRes;
            const data = (res.data && Array.isArray(res.data)) ? res.data[0] : res;

            paymentUrl = data.payment_url || data.invoiceUrl || data.url;
            asaasIds = {
                paymentId: data.asaas_payment_id || data.paymentId || data.id,
                customerId: data.asaas_customer_id || data.customerId || data.customer,
                subscriptionId: data.asaas_subscription_id || data.subscriptionId || data.subscription
            };

            if (!paymentUrl) throw new Error("n8n não retornou link de pagamento.");
        }

        // 3. SILENT Auth Creation (No invite yet)
        let userId: string;
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
            email: owner_email,
            user_metadata: { full_name: owner_name },
            email_confirm: false // Silent
        });

        if (authError) {
            // Check if user already exists
            const { data: existingUser } = await supabaseClient.from('profiles').select('id').eq('email', owner_email).maybeSingle();
            if (!existingUser) throw new Error(`Erro ao criar usuário: ${authError.message}`);
            userId = existingUser.id;
        } else {
            userId = authUser.user.id;
        }

        // 4. Create Profile & Org & Pending Payment (Atomic-ish)
        await supabaseClient.from('profiles').upsert({ id: userId, name: owner_name, email: owner_email });

        const { data: newOrg, error: orgError } = await supabaseClient.from('organizations').insert({
            name: organization.name,
            slug: organization.slug,
            plan,
            status: activate_billing ? 'pending_payment' : 'trialing',
            owner_name,
            owner_email,
            billing_document,
            billing_email,
            billing_phone,
            contracted_clients,
            max_users,
            billing_value,
            asaas_customer_id: asaasIds.customerId,
            asaas_subscription_id: asaasIds.subscriptionId
        }).select().single();

        if (orgError) throw orgError;

        // Add as manager
        await supabaseClient.from('team_members').insert({
            organization_id: newOrg.id,
            profile_id: userId,
            role: 'manager',
            status: 'active'
        });

        let pendingPaymentId = null;
        if (activate_billing) {
            const { data: pending } = await supabaseClient.from('pending_payments').insert({
                organization_id: newOrg.id,
                payment_url: paymentUrl,
                asaas_payment_id: asaasIds.paymentId,
                asaas_customer_id: asaasIds.customerId,
                asaas_subscription_id: asaasIds.subscriptionId,
                status: 'pending'
            }).select().single();
            pendingPaymentId = pending.id;
        }

        return new Response(JSON.stringify({
            organizationId: newOrg.id,
            pending_payment_id: pendingPaymentId,
            payment_url: paymentUrl
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (e: any) {
        console.error("Critical Function Error:", e.message);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 400,
            headers: corsHeaders
        });
    }
});
