-- Add portrait flag to battle photos
ALTER TABLE battle_photos ADD COLUMN IF NOT EXISTS is_portrait BOOLEAN NOT NULL DEFAULT false;
