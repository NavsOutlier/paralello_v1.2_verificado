-- Garante que a tabela pending_payments existe e tem a estrutura correta
CREATE TABLE IF NOT EXISTS public.pending_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_url TEXT,
    asaas_payment_id TEXT,
    asaas_subscription_id TEXT,
    asaas_customer_id TEXT,
    organization_id UUID REFERENCES public.organizations(id)
);

-- Habilita RLS
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

-- Garante permissões para Service Role (sempre tem acesso total, mas a policy explicita ajuda em debugging)
CREATE POLICY "Service Role Full Access" ON public.pending_payments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Permite que usuários autenticados (Admin) possam inserir pagamentos pendentes
CREATE POLICY "Authenticated Users can insert pending payments" ON public.pending_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Permite que usuários autenticados vejam seus próprios pagamentos pendentes (ou todos se for super admin, simplificado aqui)
CREATE POLICY "Authenticated Users can view pending payments" ON public.pending_payments
    FOR SELECT
    TO authenticated
    USING (true);

-- Permite update
CREATE POLICY "Authenticated Users can update pending payments" ON public.pending_payments
    FOR UPDATE
    TO authenticated
    USING (true);
