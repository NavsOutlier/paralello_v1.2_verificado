-- =====================================================
-- Manager Security Fixes: Soft Delete and Constraints
-- =====================================================

-- 1. Add deleted_at for soft deletes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_members' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE team_members ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Add unique constraint for email per organization
-- This prevents duplicate clients with same email in same org
ALTER TABLE clients DROP CONSTRAINT IF EXISTS unique_client_email_per_org;
ALTER TABLE clients ADD CONSTRAINT unique_client_email_per_org UNIQUE (organization_id, email) 
WHERE (deleted_at IS NULL AND email IS NOT NULL);

-- 3. Refine RLS Policies for better isolation

-- Clients: Ensure selection only returns non-deleted records by default
DROP POLICY IF EXISTS "Team members can read clients" ON clients;
CREATE POLICY "Team members can read clients"
  ON clients FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = clients.organization_id
      AND tm.status = 'active'
      AND tm.deleted_at IS NULL
    )
  );

-- Team Members: Ensure selection only returns non-deleted records
DROP POLICY IF EXISTS "Team members can read team" ON team_members;
CREATE POLICY "Team members can read team"
  ON team_members FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = team_members.organization_id
      AND tm.status = 'active'
      AND tm.deleted_at IS NULL
    )
  );

-- 4. Create index for soft deletes
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX IF NOT EXISTS idx_team_members_deleted_at ON team_members(deleted_at);

-- 5. Helper function for soft deleteing (optional but good practice)
-- In this app we might continue using manual UPDATES but this ensures we don't leak data
