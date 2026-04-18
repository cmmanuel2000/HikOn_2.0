-- ============================================
-- Symptom Mapping Trigger for s3_sensor_data
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create the function that will map prediction_label to cough/wheeze columns
CREATE OR REPLACE FUNCTION map_prediction_to_binary()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for "cough" in prediction_label
    IF NEW.prediction_label ILIKE '%cough%' THEN
        NEW.cough := 1;
    END IF;

    -- Check for "wheeze" in prediction_label
    IF NEW.prediction_label ILIKE '%wheeze%' THEN
        NEW.wheeze := 1;
    END IF;

    -- Default to 0 if not previously set and not in prediction
    IF NEW.cough IS NULL THEN
        NEW.cough := 0;
    END IF;
    
    IF NEW.wheeze IS NULL THEN
        NEW.wheeze := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to the s3_sensor_data table
-- Note: We drop it first to avoid duplicates if you run this twice
DROP TRIGGER IF EXISTS trg_map_prediction ON s3_sensor_data;

CREATE TRIGGER trg_map_prediction
BEFORE INSERT OR UPDATE ON s3_sensor_data
FOR EACH ROW
EXECUTE FUNCTION map_prediction_to_binary();

-- 3. (Optional) Retroactively update existing rows that have labels but no binary flags
UPDATE s3_sensor_data
SET 
  cough = CASE WHEN prediction_label ILIKE '%cough%' THEN 1 ELSE COALESCE(cough, 0) END,
  wheeze = CASE WHEN prediction_label ILIKE '%wheeze%' THEN 1 ELSE COALESCE(wheeze, 0) END
WHERE prediction_label IS NOT NULL;

SELECT '✅ Symptom mapping trigger and retroactive update complete!' as status;
