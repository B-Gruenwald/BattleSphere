import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import PhotoGallery from '@/app/components/PhotoGallery';

export default async function ArmyPage({ params }) {
  const { id } = await params;
  const supabase  = await createClient();
  const admin     = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch the army (using admin so the owner can always see their own)
  const { data: armyRows } = await admin
    .from('armies')
    .select('*')
    .eq('id', id)
    .limit(1);
  const army = armyRows?.[0] ?? null;
  if (!army) notFound();

  // Non-public armies: only the owner may view
  if (!army.is_public && army.player_id !== user?.id) notFound();

  // Player profile
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, username')
    .eq('id', army.player_id)
    .limit(1);
  const profile = profileRows?.[0] ?? null;

  // Units for this army
  const { data: units } = await admin
    .from('army_units')
    .select('*')
    .eq('army_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  // Photos for all units in one query
  const unitIds = (units || []).map(u => u.id);
  const { data: allPhotos } = unitIds.length > 0
    ? await admin
        .from('army_unit_photos')
        .select('*')
        .in('unit_id', unitIds)
        .order('created_at', { ascending: true })
    : { data: [] };

  // Group photos by unit_id
  const photosByUnit = {};
  for (const photo of allPhotos || []) {
    if (!photosByUnit[photo.unit_id]) photosByUnit[photo.unit_id] = [];
    photosByUnit[photo.unit_id].push(photo);
  }

  const isOwner = user?.id === army.player_id;

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        {profile && (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{profile.username}</span>
            <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
          </>
        )}
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Army Portfolio</span>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{army.name}</span>
      </nav>

      {/* Cover image */}
      {army.cover_image_url && (
        <div style={{ width: '100%', aspectRatio: '21/9', overflow: 'hidden', marginBottom: '2.5rem', border: '1px solid var(--border-dim)' }}>
          <img
            src={army.cover_image_url}
            alt={`${army.name} cover`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Army header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {army.name}
          </h1>
          {isOwner && (
            <Link href={`/armies/${army.id}/edit`}>
              <button className="btn-secondary" style={{ fontSize: '0.8rem' }}>Edit Army</button>
            </Link>
          )}
        </div>

        {/* Meta pills */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {army.game_system && (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
              {army.game_system}
            </span>
          )}
          {army.faction_name && (
            <>
              {army.game_system && <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>·</span>}
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {army.faction_name}
              </span>
            </>
          )}
          {profile && (
            <>
              <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>·</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {profile.username}
              </span>
            </>
          )}
        </div>

        {army.tagline && (
          <p style={{ fontSize: '1.05rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            "{army.tagline}"
          </p>
        )}
      </div>

      {/* Backstory */}
      {army.backstory && (
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem', marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
            Backstory
          </h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {army.backstory}
          </div>
        </div>
      )}

      {/* Units */}
      {(units || []).length > 0 ? (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.5rem' }}>
            Roster — {units.length} {units.length === 1 ? 'unit' : 'units'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {units.map(unit => {
              const unitPhotos = photosByUnit[unit.id] || [];
              return (
                <div key={unit.id} style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
                  {/* Unit header */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                        {unit.name}
                      </h3>
                      {unit.unit_type && (
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          {unit.unit_type}
                        </span>
                      )}
                    </div>
                    {unit.description && (
                      <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {unit.description}
                      </p>
                    )}
                  </div>

                  {/* Unit photos */}
                  {unitPhotos.length > 0 && (
                    <PhotoGallery
                      photos={unitPhotos}
                      entityType="army-unit"
                      entityId={unit.id}
                      userId={user?.id ?? null}
                      canUpload={false}
                      canManage={false}
                    />
                  )}

                  {unitPhotos.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No photos yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-dim)', padding: '3rem 2rem', textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
            No units added yet.{isOwner ? ' Head to Edit Army to build your roster.' : ''}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard">
          <button className="btn-secondary">← Dashboard</button>
        </Link>
        {isOwner && (
          <Link href={`/armies/${army.id}/edit`}>
            <button className="btn-primary">Edit Army</button>
          </Link>
        )}
      </div>
    </div>
  );
}
