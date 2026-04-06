-- Add template_type column to delivery_tracking (alias for message_type for backward compat)
ALTER TABLE public.delivery_tracking 
ADD COLUMN IF NOT EXISTS template_type text;

-- Copy existing message_type values to template_type
UPDATE public.delivery_tracking 
SET template_type = message_type 
WHERE template_type IS NULL AND message_type IS NOT NULL;

-- Create index for template_type queries
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_template_type 
ON public.delivery_tracking(template_type);
