'use client';

import { useState } from 'react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 10;

// entityType: 'battle' | 'faction'
// entityId:   the battle.id or faction.id
// photos:     initial array from server (each has { id, url, uploader_id, created_at })
// userId:     current user's id (null if not logged in)
// canManage:  true if the user has edit rights beyond just being uploader
//             (e.g. campaign organiser, battle logger, faction member)
export default function PhotoGallery({ photos: initialPhotos, entityType, entityId, userId, canManage }) {
  const [photos, setPhotos]       = useState(initialPhotos || []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [lightbox, setLightbox]   = useState(null); // url string or null
  const [deleting, setDeleting]   = useState(null); // photo id or null

  const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const canUpload    = !!userId && !!cloudName;
  const hasPhotos    = photos.length > 0;

  // Nothing to show if Cloudinary isn't configured yet and there are no photos
  if (!canUpload && !hasPhotos) return null;

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so the same file can be re-selected
    setUploadError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Please upload a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    setUploading(true);
    try {
      // ── 1. Upload directly to Cloudinary (unsigned preset) ──────────────────
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'battlesphere_unsigned');

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );
      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) {
        throw new Error(cloudData.error?.message || 'Cloudinary upload failed');
      }

      // ── 2. Save the URL to Supabase via our API route ───────────────────────
      const body = entityType === 'battle'
        ? { battleId: entityId, url: cloudData.secure_url }
        : { factionId: entityId, url: cloudData.secure_url };

      const saveRes = await fetch(`/api/photos/${entityType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save photo');

      setPhotos(prev => [...prev, saveData.photo]);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo) {
    if (!window.confirm('Remove this photo? This cannot be undone.')) return;
    setDeleting(photo.id);
    try {
      const res = await fetch(`/api/photos/${entityType}?id=${photo.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Delete failed');
      }
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem', marginBottom: '2.5rem' }}>

      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '0.65rem',
          letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)',
        }}>
          Photos
        </h2>

        {canUpload && (
          <label style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={uploading}
            />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.58rem',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: uploading ? 'var(--text-muted)' : 'var(--text-gold)',
              cursor: 'inherit',
            }}>
              {uploading ? 'Uploading…' : '+ Add Photo'}
            </span>
          </label>
        )}
      </div>

      {/* Upload error */}
      {uploadError && (
        <p style={{ color: '#e05a5a', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {uploadError}
        </p>
      )}

      {/* Gallery grid */}
      {hasPhotos ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '0.75rem',
        }}>
          {photos.map(photo => {
            const canDel    = canManage || photo.uploader_id === userId;
            const isDeleting = deleting === photo.id;
            return (
              <div key={photo.id} style={{ position: 'relative', paddingBottom: '75%', overflow: 'hidden' }}>
                <img
                  src={photo.url}
                  alt=""
                  onClick={() => setLightbox(photo.url)}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover', cursor: 'pointer',
                    border: '1px solid var(--border-dim)',
                    opacity: isDeleting ? 0.35 : 1,
                    transition: 'opacity 0.15s',
                  }}
                />
                {canDel && !isDeleting && (
                  <button
                    onClick={() => handleDelete(photo)}
                    title="Remove photo"
                    style={{
                      position: 'absolute', top: '4px', right: '4px',
                      background: 'rgba(0,0,0,0.75)', border: 'none',
                      color: '#e05a5a', cursor: 'pointer',
                      padding: '2px 7px', fontSize: '0.85rem', lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          No photos yet.{canUpload ? ' Use "+ Add Photo" to upload.' : ''}
        </p>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: '2rem',
          }}
        >
          <img
            src={lightbox}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain',
              border: '1px solid var(--border-dim)',
              cursor: 'default',
            }}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'fixed', top: '1.25rem', right: '1.5rem',
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: '1.75rem',
              cursor: 'pointer', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
