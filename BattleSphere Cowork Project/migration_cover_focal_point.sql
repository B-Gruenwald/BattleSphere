-- Add focal point control to army cover images
ALTER TABLE armies ADD COLUMN IF NOT EXISTS cover_focal_point VARCHAR NOT NULL DEFAULT 'center';
