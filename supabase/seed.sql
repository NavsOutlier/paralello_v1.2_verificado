-- SEED DATA for Recovery
-- User: navesoutlier@gmail.com
-- Org: Navs
-- Password: password123 (Temporary, user should change)

-- 1. Create Identity for Auth (Mock)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Fixed UUID for consistency
    'authenticated',
    'authenticated',
    'navesoutlier@gmail.com',
    crypt('password123', gen_salt('bf')), -- Default password
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Pedro Naves"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Organization
INSERT INTO public.organizations (
    id,
    name,
    slug,
    plan,
    status,
    owner_email,
    owner_name,
    created_at,
    updated_at
) VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    'Navs',
    'navs',
    'pro', -- Defaulting to pro to unlock features
    'active',
    'navesoutlier@gmail.com',
    'Pedro Naves',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- 3. Create Profile
INSERT INTO public.profiles (
    id,
    name,
    email,
    organization_id,
    is_super_admin,
    created_at,
    updated_at
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Matches auth.users.id
    'Pedro Naves',
    'navesoutlier@gmail.com',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', -- Matches organization.id
    true, -- Super Admin access
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- 4. Create Team Member Link
INSERT INTO public.team_members (
    organization_id,
    profile_id,
    role,
    status,
    job_title,
    created_at,
    updated_at
) VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'owner',
    'active',
    'Founder',
    now(),
    now()
) ON CONFLICT DO NOTHING;

-- 5. Default Plan Configurations (Avoids errors on dashboard)
INSERT INTO public.plan_configurations (id, name, features)
VALUES 
    ('free', 'Free', '{"max_users": 1, "max_clients": 3}'),
    ('pro', 'Pro', '{"max_users": 5, "max_clients": 20}'),
    ('agency', 'Agency', '{"max_users": 20, "max_clients": 100}')
ON CONFLICT (id) DO NOTHING;
