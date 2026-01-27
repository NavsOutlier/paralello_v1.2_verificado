-- =====================================================
-- Workers IA Schema
-- Defines tables for AI Agents, Conversations, and Messages
-- strictly separated from other AI modules.
-- =====================================================

-- 1. Create workers_ia_agents table
CREATE TABLE IF NOT EXISTS workers_ia_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_prompt TEXT,
  model TEXT DEFAULT 'gpt-4-turbo',
  temperature FLOAT DEFAULT 0.7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create workers_ia_conversations table
CREATE TABLE IF NOT EXISTS workers_ia_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES workers_ia_agents(id) ON DELETE CASCADE,
  summary TEXT,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create workers_ia_messages table
CREATE TABLE IF NOT EXISTS workers_ia_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES workers_ia_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workers_ia_agents_org ON workers_ia_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_workers_ia_conv_client ON workers_ia_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_workers_ia_conv_agent ON workers_ia_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_workers_ia_msgs_conv ON workers_ia_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_workers_ia_msgs_created ON workers_ia_messages(created_at);

-- 5. Trigger for updated_at
-- Assuming 'update_updated_at_column' function exists from previous migrations
DROP TRIGGER IF EXISTS update_workers_ia_agents_updated_at ON workers_ia_agents;
CREATE TRIGGER update_workers_ia_agents_updated_at
  BEFORE UPDATE ON workers_ia_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workers_ia_conversations_updated_at ON workers_ia_conversations;
CREATE TRIGGER update_workers_ia_conversations_updated_at
  BEFORE UPDATE ON workers_ia_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable RLS
ALTER TABLE workers_ia_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers_ia_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers_ia_messages ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies

-- workers_ia_agents
DROP POLICY IF EXISTS "Org members can view agents" ON workers_ia_agents;
CREATE POLICY "Org members can view agents"
  ON workers_ia_agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = workers_ia_agents.organization_id
      AND tm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Managers can manage agents" ON workers_ia_agents;
CREATE POLICY "Managers can manage agents"
  ON workers_ia_agents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = workers_ia_agents.organization_id
      AND tm.role = 'manager'
      AND tm.status = 'active'
    )
  );

-- workers_ia_conversations
DROP POLICY IF EXISTS "Org members can view conversations" ON workers_ia_conversations;
CREATE POLICY "Org members can view conversations"
  ON workers_ia_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = workers_ia_conversations.organization_id
      AND tm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Org members can insert conversations" ON workers_ia_conversations;
CREATE POLICY "Org members can insert conversations"
  ON workers_ia_conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.profile_id = auth.uid()
      AND tm.organization_id = workers_ia_conversations.organization_id
      AND tm.status = 'active'
    )
  );

-- workers_ia_messages
DROP POLICY IF EXISTS "Org members can view messages" ON workers_ia_messages;
CREATE POLICY "Org members can view messages"
  ON workers_ia_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workers_ia_conversations c
      JOIN team_members tm ON tm.organization_id = c.organization_id
      WHERE c.id = workers_ia_messages.conversation_id
      AND tm.profile_id = auth.uid()
      AND tm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Org members can insert messages" ON workers_ia_messages;
CREATE POLICY "Org members can insert messages"
  ON workers_ia_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers_ia_conversations c
      JOIN team_members tm ON tm.organization_id = c.organization_id
      WHERE c.id = workers_ia_messages.conversation_id
      AND tm.profile_id = auth.uid()
      AND tm.status = 'active'
    )
  );

-- Done!
