-- Consolidate certificate_templates from 3 types (med_cert_work, med_cert_uni, med_cert_carer)
-- to a single unified type (med_cert). All three types used an identical static PDF template
-- and identical config — the distinction was only in the title, which is now rendered
-- dynamically by the PDF renderer based on certificateType in TemplatePdfInput.

-- 1. Drop the old 3-value check constraint
ALTER TABLE certificate_templates
  DROP CONSTRAINT certificate_templates_template_type_check;

-- 2. Delete the two redundant rows (identical config to work)
DELETE FROM certificate_templates
  WHERE template_type IN ('med_cert_uni', 'med_cert_carer');

-- 3. Rename the remaining row to the new unified type
UPDATE certificate_templates
  SET template_type = 'med_cert',
      name = 'Medical Certificate Template v1'
  WHERE template_type = 'med_cert_work';

-- 4. Add new constraint with single allowed value
ALTER TABLE certificate_templates
  ADD CONSTRAINT certificate_templates_template_type_check
  CHECK (template_type = 'med_cert');
