'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BUCKET = 'territory-images';

export default function TerritoryImageUpload({ campaignId, territoryId, currentImageUrl, onImageChange }) {
  const supabase = createClient();
  const fileInputRef = useRef(null);

  const [uploading, setUploading]   = useState(false);
  const [removing,  setRemoving]    = useState(false);
  const [error,     setError]       = useState('');
  const [preview,   setPreview]     = useState(currentImageUrl || null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, or WebP images are accepted.');
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    setUploading(true);

    try {
      // Build storage path: campaign_id/territory_id/filename
      const ext  = file.name.split('.').pop();
      const path = `${campaignId}/${territoryId}/image.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Save URL to territories table
      const { error: dbError } = await supabase
        .from('territories')
        .update({ image_url: publicUrl })
        .eq('id', territoryId);

      if (dbError) throw dbError;

      setPreview(publicUrl);
      if (onImageChange) onImageChange(publicUrl);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be re-uploaded if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemove() {
    setError('');
    setRemoving(true);

    try {
      // Remove the image_url from the database first
      const { error: dbError } = await supabase
        .from('territories')
        .update({ image_url: null })
        .eq('id', territoryId);

      if (dbError) throw dbError;

      // Best-effort: delete the file from storage (try jpg/png/webp)
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      for (const ext of extensions) {
        const path = `${campaignId}/${territoryId}/image.${ext}`;
        await supabase.storage.from(BUCKET).remove([path]);
      }

      setPreview(null);
      if (onImageChange) onImageChange(null);
    } catch (err) {
      setError(err.message || 'Could not remove image. Please try again.');
    } finally {
      setRemoving(false);
    }
  }

  const inputStyle = {
    display: 'none',
  };

  const btnStyle = {
    display: 'inline-block',
    padding: '0.45rem 1.1rem',
    fontSize: '0.82rem',
    cursor: uploading || removing ? 'not-allowed' : 'pointer',
    opacity: uploading || removing ? 0.6 : 1,
  };

  return (
    <div>
      {/* Current image preview */}
      {preview && (
        <div style={{ marginBottom: '1rem' }}>
          <img
            src={preview}
            alt="Territory"
            style={{
              width: '100%',
              maxHeight: '280px',
              objectFit: 'cover',
              display: 'block',
              border: '1px solid var(--border-dim)',
            }}
          />
        </div>
      )}

      {/* Upload / replace / remove controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={inputStyle}
          onChange={handleFileChange}
          disabled={uploading || removing}
        />
        <button
          type="button"
          className="btn-secondary"
          style={btnStyle}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || removing}
        >
          {uploading ? 'Uploading…' : preview ? 'Replace Image' : 'Upload Image'}
        </button>

        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading || removing}
            style={{
              background: 'none',
              border: 'none',
              color: '#e05a5a',
              cursor: removing ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
              opacity: removing ? 0.6 : 1,
              padding: 0,
            }}
          >
            {removing ? 'Removing…' : 'Remove image'}
          </button>
        )}
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
        JPG, PNG, or WebP · max {MAX_SIZE_MB} MB
      </p>

      {error && (
        <p style={{ color: '#e05a5a', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>
      )}
    </div>
  );
}
