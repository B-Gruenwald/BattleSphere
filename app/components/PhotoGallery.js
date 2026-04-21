'use client';

import { useState } from 'react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 10;

// entityType: 'battle' | 'faction' | 'army-unit'
// entityId:   the battle.id / faction.id / unit.id
// photos:     initial array from server (each has { id, url, uploader_id, created_at, is_portrait? })
// userId:     current user's id (null if not logged in)
// canUpload:  true if this user is allowed to add photos (battle participant / faction member)
// canManage:  true if the user has edit rights beyond just being uploader
//             (e.g. campaign organiser, battle logger, faction member)
// portraitPhotoId:       (army-unit only) id of the current portrait photo, or null
// onPortraitPhotoIdChange: (army-unit only) callback(newId) when portrait changes
export default function PhotoGallery({ photos: initialPhotos, entityType, entityId, userId, canUpload: canUploadProp, canManage, portraitPhotoId, onPortraitPhotoIdChange }) {
  const [photos, setPhotos]           = useState(initialPhotos || []);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadError, setUploadError] = useState(null);
  const [lightbox, setLightbox]       = useState(null); // url string or null
  const [deleting, setDeleting]       = useState(null); // photo id or null
  const [settingPortrait, setSettingPortrait] = useState(null); // photo id or null

  const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const canUpload    = !!canUploadProp && !!userId && !!cloudName;
  const hasPhotos    = photos.length > 0;

  // Nothing to show if Cloudinary isn't configured yet and there are no photos
  if (!canUpload && !hasPhotos) return null;

  async function uploadOne(file) {
    // ── 1. Upload directly to Cloudinary (unsigned preset) ────────────────────
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

    // ── 2. Save the URL to Supabase via our API route ─────────────────────────
    const body = entityType === 'battle'
      ? { battleId: entityId, url: cloudData.secure_url }
      : entityType === 'faction'
        ? { factionId: entityId, url: cloudData.secure_url }
        : { unitId: entityId, url: cloudData.secure_url }; // army-unit

    const saveRes = await fetch(`/api/photos/${entityType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const saveData = await saveRes.json();
    if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save photo');

    return saveData.photo;
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // reset so the same files can be re-selected
    if (!files.length) return;
    setUploadError(null);

    // Validate all files first
    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError(`"${file.name}" is not a supported image type (JPG, PNG, WebP, GIF).`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds the ${MAX_SIZE_MB} MB limit.`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    const errors = [];
    for (const file of files) {
      try {
        const photo = await uploadOne(file);
        setPhotos(prev => [...prev, photo]);
        setUploadProgress(prev => ({ ...prev, done: prev.done + 1 }));
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    setUploading(false);
    setUploadProgress({ done: 0, total: 0 });
    if (errors.length) setUploadError(errors.join(' · '));
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
      setPhotos(prev => {
        const remaining = prev.filter(p => p.id !== photo.id);
        // If deleted photo was the portrait, update the parent with the next available photo
        if (onPortraitPhotoIdChange && photo.id === portraitPhotoId) {
          onPortraitPhotoIdChange(remaining[0]?.id ?? null);
        }
        return remaining;
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleSetPortrait(photo) {
    if (settingPortrait) return;
    setSettingPortrait(photo.id);
    try {
      const res = await fetch('/api/photos/army-unit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id, unitId: entityId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to set portrait');
      }
      onPortraitPhotoIdChange(photo.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setSettingPortrait(null);
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
              multiple
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
              {uploading
                ? uploadProgress.total > 1
                  ? `Uploading ${uploadProgress.done + 1} / ${uploadProgress.total}…`
                  : 'Uploading…'
                : '+ Add Photos'}
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
            const canDel      = canManage || photo.uploader_id === userId;
            const isDeleting  = deleting === photo.id;
            const isBusy      = isDeleting || settingPortrait === photo.id;
            const isPortrait  = portraitPhotoId != null && photo.id === portraitPhotoId;
            const showPortrait = !!onPortraitPhotoIdChange && canManage;
            return (
              <div key={photo.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Image */}
                <div style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden' }}>
                  <img
                    src={photo.url}
                    alt=""
                    onClick={() => setLightbox(photo.url)}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover', cursor: 'pointer',
                      border: isPortrait ? '2px solid var(--gold)' : '1px solid var(--border-dim)',
                      opacity: isBusy ? 0.35 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  />
                  {canDel && !isBusy && (
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

                {/* Portrait button / label */}
                {showPortrait && (
                  isPortrait ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '0.3rem 0',
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.52rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-gold)',
                    }}>
                      Portrait ✓
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSetPortrait(photo)}
                      disabled={!!settingPortrait || isDeleting}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border-dim)',
                        borderTop: 'none',
                        color: settingPortrait === photo.id ? 'var(--text-muted)' : 'var(--text-secondary)',
                        cursor: settingPortrait ? 'not-allowed' : 'pointer',
                        padding: '0.3rem 0',
                        width: '100%',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.52rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        opacity: settingPortrait && settingPortrait !== photo.id ? 0.4 : 1,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      {settingPortrait === photo.id ? 'Setting…' : 'Set as Portrait'}
                    </button>
                  )
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
