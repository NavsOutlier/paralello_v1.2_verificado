-- =====================================================
-- Manager Tables: Clients and Team Members
-- =====================================================

-- 1. Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('manager', 'member', 'viewer')),
  permissions JSONB DEFAULT '{"can_manage_clients": true, "can_manage_tasks": true, "can_manage_team": false}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, profile_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_organization ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

CREATE INDEX IF NOT EXISTS idx_team_members_organization ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_profile ON team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- 4. Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for clients
-- Managers and team members can read clients from their organization
DROP POLICY IF EXISTS "Team members can read clients" ON clients;
CREATE POLICY "Team members can read clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = clients.organization_id
      AND tm.status = 'active'
    )
  );

-- Managers can insert clients
DROP POLICY IF EXISTS "Managers can insert clients" ON clients;
CREATE POLICY "Managers can insert clients"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = clients.organization_id
      AND tm.role IN ('manager')
      AND tm.status = 'active'
    )
  );

-- Managers can update clients
DROP POLICY IF EXISTS "Managers can update clients" ON clients;
CREATE POLICY "Managers can update clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = clients.organization_id
      AND tm.role IN ('manager')
      AND tm.status = 'active'
    )
  );

-- Managers can delete clients
DROP POLICY IF EXISTS "Managers can delete clients" ON clients;
CREATE POLICY "Managers can delete clients"
  ON clients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = clients.organization_id
      AND tm.role IN ('manager')
      AND tm.status = 'active'
    )
  );

-- 6. RLS Policies for team_members
-- Team members can read other members from their organization
DROP POLICY IF EXISTS "Team members can read team" ON team_members;
CREATE POLICY "Team members can read team"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = team_members.organization_id
      AND tm.status = 'active'
    )
  );

-- Managers can insert team members
DROP POLICY IF EXISTS "Managers can insert team members" ON team_members;
CREATE POLICY "Managers can insert team members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = team_members.organization_id
      AND tm.role IN ('manager')
      AND tm.status = 'active'
    )
  );

-- Managers can update team members
DROP POLICY IF EXISTS "Managers can update team members" ON team_members;
CREATE POLICY "Managers can update team members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = team_members.organization_id
      AND tm.role IN ('manager')
      AND tm.status = 'active'
    )
  );

-- Managers can delete team members
DROP POLICY IF EXISTS "Managers can delete team members" ON team_members;
CREATE POLICY "Managers can delete team members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = team_members.organization_id
      AND tm.role IN ('manager')
      AND tm.status = 'active'
    )
  );

-- 7. Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Done! Manager tables created with RLS policies
-- =====================================================
