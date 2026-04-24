import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import ReorderableRoster from '@/app/components/ReorderableRoster';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: armyRows } = await admin.from('armies').select('*').eq('id', id).limit(1);
  const army = armyRows?.[0];
  if (!army) return {};

  const { data: profileRows } = await admin.from('profiles').select('username').eq('id', army.player_id).limit(1);
  const playerName = profileRows?.[0]?.username ?? null;
  const { count: unitCount } = await admin.from('army_units').select('*', { count: 'exact', head: true }).eq('army_id', id);

  const title       = `${army.name} — BattleSphere`;
  const description = army.description
    ? army.description.slice(0, 155)
    : `${army.faction_name ? army.faction_name + ' army' : 'Army'} commanded by ${playerName ?? 'an unknown warlord'} · ${unitCount ?? 0} units`;

  return {
    title,
    description,
    openGraph: { title, description, siteName: 'BattleSphere' },
    twitter:   { card: 'summary_large_image', title, description },
  };
}

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
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {profile && (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{profile.username}</span>
            <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>›</span>
          </>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Army Portfolio</span>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{army.name}</span>
      </nav>

      {/* Cover image */}
      {army.cover_image_url && (
        <div style={{ width: '100%', aspectRatio: '21/9', overflow: 'hidden', marginBottom: '1.25rem', border: '1px solid var(--border-dim)' }}>
          <img
            src={army.cover_image_url}
            alt={`${army.name} cover`}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: army.cover_focal_point === 'top' ? 'center top'
                : army.cover_focal_point === 'bottom' ? 'center bottom'
                : 'center',
            }}
          />
        </div>
      )}

      {/* Army header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            {army.name}
          </h1>
          {/* Meta pills */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {army.game_system && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                {army.game_system}
              </span>
            )}
            {army.faction_name && (
              <>
                {army.game_system && <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>·</span>}
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {army.faction_name}
                </span>
              </>
            )}
            {profile && (
              <>
                <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>·</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {profile.username}
                </span>
              </>
            )}
          </div>
          {army.tagline && (
            <p style={{ marginTop: '0.4rem', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              "{army.tagline}"
            </p>
          )}
        </div>
        {isOwner && (
          <Link href={`/armies/${army.id}/edit`}>
            <button className="btn-secondary" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Edit Army</button>
          </Link>
        )}
      </div>

      {/* Backstory */}
      {army.backstory && (
        <div style={{ border: '1px solid var(--border-dim)', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
            Backstory
          </h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
            {army.backstory}
          </div>
        </div>
      )}

      {/* Units */}
      {(units || []).length > 0 ? (
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
            Roster — {units.length} {units.length === 1 ? 'unit' : 'units'}
          </h2>
          <ReorderableRoster
            initialUnits={units}
            armyId={army.id}
            isOwner={isOwner}
            photosByUnit={photosByUnit}
            userId={user?.id ?? null}
          />
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem', textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.88rem' }}>
            No units added yet.{isOwner ? ' Head to Edit Army to build your roster.' : ''}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard">
          <button className="btn-secondary" style={{ fontSize: '0.8rem' }}>← Dashboard</button>
        </Link>
        {isOwner && (
          <Link href={`/armies/${army.id}/edit`}>
            <button className="btn-primary" style={{ fontSize: '0.8rem' }}>Edit Army</button>
          </Link>
        )}
      </div>
    </div>
  );
}
