ALTER TABLE jobui_profiles
    ADD COLUMN IF NOT EXISTS application_name text;

UPDATE jobui_profiles
SET application_name = 'SimphonyBIAPI-Sample'
WHERE application_name IS NULL OR application_name = '';
