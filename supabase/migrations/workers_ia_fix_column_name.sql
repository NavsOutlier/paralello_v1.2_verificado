-- =====================================================
-- Fix: Rename 'content' to 'message'
-- Compatibility with n8n Postgres Chat Memory node
-- =====================================================

ALTER TABLE workers_ia_messages 
RENAME COLUMN content TO message;

-- Verify the change (optional)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'workers_ia_messages';
