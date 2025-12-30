-- =====================================================
-- Super Admin: Organizations - SAFE MIGRATION
-- Adiciona colunas faltantes SEM dropar a tabela
-- =====================================================

-- 1. Adicionar coluna 'status' se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'status'
  ) THEN
    ALTER TABLE organizations ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- 2. Adicionar coluna 'plan' se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'plan'
  ) THEN
    ALTER TABLE organizations ADD COLUMN plan TEXT NOT NULL DEFAULT 'pro' CHECK (plan IN ('basic', 'pro', 'enterprise'));
  END IF;
END $$;

-- 3. Adicionar coluna 'owner_name' se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE organizations ADD COLUMN owner_name TEXT NOT NULL DEFAULT 'Admin';
  END IF;
END $$;

-- 4. Adicionar coluna 'owner_email' se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'owner_email'
  ) THEN
    ALTER TABLE organizations ADD COLUMN owner_email TEXT NOT NULL DEFAULT 'admin@example.com';
  END IF;
END $$;

-- 5. Adicionar colunas de stats se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'stats_users'
  ) THEN
    ALTER TABLE organizations ADD COLUMN stats_users INT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'stats_clients'
  ) THEN
    ALTER TABLE organizations ADD COLUMN stats_clients INT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'stats_tasks'
  ) THEN
    ALTER TABLE organizations ADD COLUMN stats_tasks INT DEFAULT 0;
  END IF;
END $$;

-- 6. Criar indexes (se não existirem)
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);

-- 7. Trigger for auto-updating updated_at (se updated_at existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Add is_super_admin to profiles table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 9. Enable RLS on organizations (se ainda não estiver)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for organizations
DROP POLICY IF EXISTS "Super admins can read organizations" ON organizations;
CREATE POLICY "Super admins can read organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
CREATE POLICY "Super admins can insert organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;
CREATE POLICY "Super admins can delete organizations"
  ON organizations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = TRUE
    )
  );

-- 11. Mark your user as super admin
UPDATE profiles SET is_super_admin = TRUE WHERE email = 'navesoutlier@gmail.com';

-- =====================================================
-- Done! This migration is SAFE - preserves existing data
-- =====================================================
