-- ============================================
-- MEDICATIONS TABLE
-- Searchable medication database for prescription flows
-- ============================================

CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,                      -- Generic name (e.g., "Atorvastatin")
  brand_names TEXT[] DEFAULT '{}',         -- Brand names (e.g., ["Lipitor", "Atorlip"])
  synonyms TEXT[] DEFAULT '{}',            -- Alternative names/spellings
  
  -- Classification
  category TEXT NOT NULL,                  -- Category slug (e.g., "cardiovascular", "respiratory")
  category_label TEXT NOT NULL,            -- Display label (e.g., "Cardiovascular")
  schedule TEXT,                           -- PBS schedule (S2, S3, S4, S8, etc.)
  
  -- Forms and strengths
  forms JSONB DEFAULT '[]',                -- Available forms: [{"form": "tablet", "strengths": ["10mg", "20mg", "40mg"]}]
  default_form TEXT,                       -- Most common form
  default_strength TEXT,                   -- Most common strength
  
  -- Prescription info
  is_repeatable BOOLEAN DEFAULT true,      -- Can be prescribed as repeat
  max_repeats INTEGER DEFAULT 5,           -- Maximum repeats allowed
  requires_authority BOOLEAN DEFAULT false, -- Requires authority prescription
  is_controlled BOOLEAN DEFAULT false,     -- S8 or controlled substance
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(brand_names, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(synonyms, ' '), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(category_label, '')), 'D')
  ) STORED,
  
  -- Display
  display_order INTEGER DEFAULT 100,
  is_common BOOLEAN DEFAULT false,         -- Show in "common medications" list
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search
CREATE INDEX IF NOT EXISTS idx_medications_search ON public.medications USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_medications_name ON public.medications (name);
CREATE INDEX IF NOT EXISTS idx_medications_category ON public.medications (category);
CREATE INDEX IF NOT EXISTS idx_medications_common ON public.medications (is_common) WHERE is_common = true;
CREATE INDEX IF NOT EXISTS idx_medications_active ON public.medications (is_active) WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can search medications)
CREATE POLICY "medications_public_read" ON public.medications
  FOR SELECT USING (is_active = true);

-- Only admins can modify
CREATE POLICY "medications_admin_all" ON public.medications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- SEED DATA (50 common medications)
-- ============================================

INSERT INTO public.medications (name, brand_names, category, category_label, schedule, forms, default_form, default_strength, is_common, display_order) VALUES
-- Cardiovascular
('Atorvastatin', ARRAY['Lipitor', 'Atorlip'], 'cardiovascular', 'Cardiovascular', 'S4', '[{"form": "tablet", "strengths": ["10mg", "20mg", "40mg", "80mg"]}]', 'tablet', '20mg', true, 1),
('Rosuvastatin', ARRAY['Crestor'], 'cardiovascular', 'Cardiovascular', 'S4', '[{"form": "tablet", "strengths": ["5mg", "10mg", "20mg", "40mg"]}]', 'tablet', '10mg', true, 2),
('Perindopril', ARRAY['Coversyl'], 'cardiovascular', 'Cardiovascular', 'S4', '[{"form": "tablet", "strengths": ["2.5mg", "5mg", "10mg"]}]', 'tablet', '5mg', true, 3),
('Ramipril', ARRAY['Tritace', 'Ramace'], 'cardiovascular', 'Cardiovascular', 'S4', '[{"form": "capsule", "strengths": ["1.25mg", "2.5mg", "5mg", "10mg"]}]', 'capsule', '5mg', true, 4),
('Amlodipine', ARRAY['Norvasc'], 'cardiovascular', 'Cardiovascular', 'S4', '[{"form": "tablet", "strengths": ["5mg", "10mg"]}]', 'tablet', '5mg', true, 5),
('Metoprolol', ARRAY['Betaloc', 'Minax'], 'cardiovascular', 'Cardiovascular', 'S4', '[{"form": "tablet", "strengths": ["25mg", "50mg", "100mg"]}]', 'tablet', '50mg', true, 6),
('Bisoprolol', ARRAY['Bicor'], 'cardiovascular', 'Cardiovascular', 'S4', '[{"form": "tablet", "strengths": ["2.5mg", "5mg", "10mg"]}]', 'tablet', '5mg', false, 7),
('Irbesartan', ARRAY['Avapro', 'Karvea'], 'cardiovascular', 'Cardiovascular', 'S4', '[{"form": "tablet", "strengths": ["75mg", "150mg", "300mg"]}]', 'tablet', '150mg', false, 8),

-- Diabetes
('Metformin', ARRAY['Diabex', 'Diaformin', 'Glucophage'], 'diabetes', 'Diabetes', 'S4', '[{"form": "tablet", "strengths": ["500mg", "850mg", "1000mg"]}, {"form": "XR tablet", "strengths": ["500mg", "1000mg"]}]', 'tablet', '500mg', true, 10),
('Gliclazide', ARRAY['Diamicron', 'Glyade'], 'diabetes', 'Diabetes', 'S4', '[{"form": "tablet", "strengths": ["40mg", "80mg"]}, {"form": "MR tablet", "strengths": ["30mg", "60mg"]}]', 'MR tablet', '60mg', false, 11),
('Empagliflozin', ARRAY['Jardiance'], 'diabetes', 'Diabetes', 'S4', '[{"form": "tablet", "strengths": ["10mg", "25mg"]}]', 'tablet', '10mg', false, 12),

-- Respiratory
('Salbutamol', ARRAY['Ventolin', 'Asmol'], 'respiratory', 'Respiratory', 'S3', '[{"form": "inhaler", "strengths": ["100mcg/dose"]}]', 'inhaler', '100mcg/dose', true, 20),
('Fluticasone/Salmeterol', ARRAY['Seretide'], 'respiratory', 'Respiratory', 'S4', '[{"form": "inhaler", "strengths": ["125/25mcg", "250/25mcg", "500/50mcg"]}]', 'inhaler', '250/25mcg', true, 21),
('Budesonide/Formoterol', ARRAY['Symbicort'], 'respiratory', 'Respiratory', 'S4', '[{"form": "inhaler", "strengths": ["100/6mcg", "200/6mcg", "400/12mcg"]}]', 'inhaler', '200/6mcg', true, 22),
('Montelukast', ARRAY['Singulair'], 'respiratory', 'Respiratory', 'S4', '[{"form": "tablet", "strengths": ["4mg", "5mg", "10mg"]}]', 'tablet', '10mg', false, 23),
('Tiotropium', ARRAY['Spiriva'], 'respiratory', 'Respiratory', 'S4', '[{"form": "inhaler", "strengths": ["18mcg"]}]', 'inhaler', '18mcg', false, 24),

-- Thyroid
('Levothyroxine', ARRAY['Eutroxsig', 'Oroxine'], 'thyroid', 'Thyroid', 'S4', '[{"form": "tablet", "strengths": ["25mcg", "50mcg", "75mcg", "100mcg", "125mcg", "150mcg", "200mcg"]}]', 'tablet', '100mcg', true, 30),

-- Gastrointestinal
('Omeprazole', ARRAY['Losec', 'Maxor'], 'gastrointestinal', 'Gastrointestinal', 'S4', '[{"form": "capsule", "strengths": ["10mg", "20mg", "40mg"]}]', 'capsule', '20mg', true, 40),
('Pantoprazole', ARRAY['Somac', 'Protonix'], 'gastrointestinal', 'Gastrointestinal', 'S4', '[{"form": "tablet", "strengths": ["20mg", "40mg"]}]', 'tablet', '40mg', true, 41),
('Esomeprazole', ARRAY['Nexium'], 'gastrointestinal', 'Gastrointestinal', 'S4', '[{"form": "tablet", "strengths": ["20mg", "40mg"]}]', 'tablet', '20mg', false, 42),

-- Mental Health
('Escitalopram', ARRAY['Lexapro', 'Esipram'], 'mental_health', 'Mental Health', 'S4', '[{"form": "tablet", "strengths": ["5mg", "10mg", "20mg"]}]', 'tablet', '10mg', true, 50),
('Sertraline', ARRAY['Zoloft'], 'mental_health', 'Mental Health', 'S4', '[{"form": "tablet", "strengths": ["25mg", "50mg", "100mg"]}]', 'tablet', '50mg', true, 51),
('Venlafaxine', ARRAY['Efexor', 'Effexor'], 'mental_health', 'Mental Health', 'S4', '[{"form": "XR capsule", "strengths": ["37.5mg", "75mg", "150mg"]}]', 'XR capsule', '75mg', false, 52),
('Mirtazapine', ARRAY['Remeron', 'Avanza'], 'mental_health', 'Mental Health', 'S4', '[{"form": "tablet", "strengths": ["15mg", "30mg", "45mg"]}]', 'tablet', '30mg', false, 53),

-- Pain & Inflammation
('Celecoxib', ARRAY['Celebrex'], 'pain', 'Pain & Inflammation', 'S4', '[{"form": "capsule", "strengths": ["100mg", "200mg"]}]', 'capsule', '200mg', true, 60),
('Meloxicam', ARRAY['Mobic'], 'pain', 'Pain & Inflammation', 'S4', '[{"form": "tablet", "strengths": ["7.5mg", "15mg"]}]', 'tablet', '15mg', false, 61),
('Naproxen', ARRAY['Naprosyn', 'Naprogesic'], 'pain', 'Pain & Inflammation', 'S2', '[{"form": "tablet", "strengths": ["250mg", "500mg"]}]', 'tablet', '500mg', false, 62),

-- Contraception
('Levonorgestrel/Ethinylestradiol', ARRAY['Levlen', 'Microgynon', 'Monofeme'], 'contraception', 'Contraception', 'S4', '[{"form": "tablet", "strengths": ["150/30mcg"]}]', 'tablet', '150/30mcg', true, 70),
('Norethisterone/Ethinylestradiol', ARRAY['Brevinor', 'Norimin'], 'contraception', 'Contraception', 'S4', '[{"form": "tablet", "strengths": ["500/35mcg"]}]', 'tablet', '500/35mcg', false, 71),
('Drospirenone/Ethinylestradiol', ARRAY['Yaz', 'Yasmin'], 'contraception', 'Contraception', 'S4', '[{"form": "tablet", "strengths": ["3mg/20mcg", "3mg/30mcg"]}]', 'tablet', '3mg/20mcg', true, 72),
('Etonogestrel', ARRAY['Implanon NXT'], 'contraception', 'Contraception', 'S4', '[{"form": "implant", "strengths": ["68mg"]}]', 'implant', '68mg', false, 73),

-- Allergy
('Cetirizine', ARRAY['Zyrtec'], 'allergy', 'Allergy', 'S2', '[{"form": "tablet", "strengths": ["10mg"]}]', 'tablet', '10mg', true, 80),
('Loratadine', ARRAY['Claratyne', 'Claritin'], 'allergy', 'Allergy', 'S2', '[{"form": "tablet", "strengths": ["10mg"]}]', 'tablet', '10mg', true, 81),
('Fexofenadine', ARRAY['Telfast', 'Allegra'], 'allergy', 'Allergy', 'S3', '[{"form": "tablet", "strengths": ["60mg", "120mg", "180mg"]}]', 'tablet', '180mg', false, 82),
('Fluticasone', ARRAY['Flixonase'], 'allergy', 'Allergy', 'S3', '[{"form": "nasal spray", "strengths": ["50mcg/spray"]}]', 'nasal spray', '50mcg/spray', true, 83),

-- Antibiotics (short course, not repeatable)
('Amoxicillin', ARRAY['Amoxil', 'Cilamox'], 'antibiotics', 'Antibiotics', 'S4', '[{"form": "capsule", "strengths": ["250mg", "500mg"]}, {"form": "suspension", "strengths": ["125mg/5ml", "250mg/5ml"]}]', 'capsule', '500mg', true, 90),
('Amoxicillin/Clavulanate', ARRAY['Augmentin', 'Clavulin'], 'antibiotics', 'Antibiotics', 'S4', '[{"form": "tablet", "strengths": ["500/125mg", "875/125mg"]}]', 'tablet', '875/125mg', true, 91),
('Azithromycin', ARRAY['Zithromax'], 'antibiotics', 'Antibiotics', 'S4', '[{"form": "tablet", "strengths": ["250mg", "500mg"]}]', 'tablet', '500mg', false, 92),
('Cefalexin', ARRAY['Keflex', 'Ibilex'], 'antibiotics', 'Antibiotics', 'S4', '[{"form": "capsule", "strengths": ["250mg", "500mg"]}]', 'capsule', '500mg', false, 93),
('Doxycycline', ARRAY['Doryx', 'Vibramycin'], 'antibiotics', 'Antibiotics', 'S4', '[{"form": "capsule", "strengths": ["50mg", "100mg"]}]', 'capsule', '100mg', false, 94),
('Trimethoprim', ARRAY['Alprim'], 'antibiotics', 'Antibiotics', 'S4', '[{"form": "tablet", "strengths": ["150mg", "300mg"]}]', 'tablet', '300mg', false, 95),

-- Skin
('Adapalene', ARRAY['Differin'], 'skin', 'Skin', 'S4', '[{"form": "gel", "strengths": ["0.1%"]}]', 'gel', '0.1%', false, 100),
('Tretinoin', ARRAY['Retrieve', 'Retin-A'], 'skin', 'Skin', 'S4', '[{"form": "cream", "strengths": ["0.025%", "0.05%"]}]', 'cream', '0.05%', false, 101),
('Benzoyl Peroxide', ARRAY['Benzac', 'PanOxyl'], 'skin', 'Skin', 'S2', '[{"form": "gel", "strengths": ["2.5%", "5%", "10%"]}]', 'gel', '5%', false, 102),
('Clindamycin', ARRAY['Duac', 'Clindatech'], 'skin', 'Skin', 'S4', '[{"form": "gel", "strengths": ["1%"]}]', 'gel', '1%', false, 103),

-- Men''s Health
('Sildenafil', ARRAY['Viagra', 'Vedafil'], 'mens_health', 'Mens Health', 'S4', '[{"form": "tablet", "strengths": ["25mg", "50mg", "100mg"]}]', 'tablet', '50mg', true, 110),
('Tadalafil', ARRAY['Cialis'], 'mens_health', 'Mens Health', 'S4', '[{"form": "tablet", "strengths": ["5mg", "10mg", "20mg"]}]', 'tablet', '10mg', true, 111),
('Finasteride', ARRAY['Propecia', 'Proscar'], 'mens_health', 'Mens Health', 'S4', '[{"form": "tablet", "strengths": ["1mg", "5mg"]}]', 'tablet', '1mg', false, 112),

-- Other
('Prednisolone', ARRAY['Panafcortelone', 'Solone'], 'immunology', 'Immunology', 'S4', '[{"form": "tablet", "strengths": ["1mg", "5mg", "25mg"]}]', 'tablet', '25mg', false, 120),
('Prednisone', ARRAY['Sone', 'Panafcort'], 'immunology', 'Immunology', 'S4', '[{"form": "tablet", "strengths": ["1mg", "5mg", "25mg"]}]', 'tablet', '5mg', false, 121)

ON CONFLICT DO NOTHING;

-- Update antibiotics to not be repeatable
UPDATE public.medications 
SET is_repeatable = false, max_repeats = 0 
WHERE category = 'antibiotics';

-- ============================================
-- HELPER FUNCTION FOR SEARCH
-- ============================================

CREATE OR REPLACE FUNCTION search_medications(
  search_query TEXT,
  limit_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  brand_names TEXT[],
  category TEXT,
  category_label TEXT,
  schedule TEXT,
  forms JSONB,
  default_form TEXT,
  default_strength TEXT,
  is_common BOOLEAN,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.brand_names,
    m.category,
    m.category_label,
    m.schedule,
    m.forms,
    m.default_form,
    m.default_strength,
    m.is_common,
    ts_rank(m.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM public.medications m
  WHERE m.is_active = true
    AND (
      m.search_vector @@ websearch_to_tsquery('english', search_query)
      OR m.name ILIKE '%' || search_query || '%'
      OR EXISTS (SELECT 1 FROM unnest(m.brand_names) AS bn WHERE bn ILIKE '%' || search_query || '%')
    )
  ORDER BY 
    m.is_common DESC,
    ts_rank(m.search_vector, websearch_to_tsquery('english', search_query)) DESC,
    m.display_order ASC
  LIMIT limit_results;
END;
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION search_medications TO anon, authenticated;
