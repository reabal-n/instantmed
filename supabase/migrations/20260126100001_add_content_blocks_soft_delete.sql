-- ============================================================================
-- ADD SOFT DELETE TO CONTENT BLOCKS
-- Adds deleted_at column for audit trail preservation
-- ============================================================================

-- Add deleted_at column for soft delete
ALTER TABLE public.content_blocks 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_content_blocks_deleted_at 
ON public.content_blocks(deleted_at) 
WHERE deleted_at IS NULL;

-- Update RLS policy to exclude deleted records from reads
DROP POLICY IF EXISTS "Anyone can read content blocks" ON public.content_blocks;

CREATE POLICY "Anyone can read content blocks" 
  ON public.content_blocks
  FOR SELECT 
  TO authenticated
  USING (deleted_at IS NULL);

COMMENT ON COLUMN public.content_blocks.deleted_at IS 'Soft delete timestamp - NULL means active, set means deleted';
