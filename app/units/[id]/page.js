import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import ShareUnitButton from '@/app/components/ShareUnitButton';
import UnitPortraitHero from '@/app/components/UnitPortraitHero';
import UnitPhotosViewer from '@/app/components/UnitPhotosViewer';

// ── Dynamic metadata (title, description, og:image, twitter card) ───────────
export async function generateMetadata({ params }) {
  const { id } = await params;
  const admin  = createAdminClient();

  const { data: unitRows } = await admin
    .from('army_units')
    .select('*')
    .eq('id', id)
    .limit(1);
  const unit = unitRows?.[0] ?? null;
  if (!unit) {
    return {
      title: 'Unit not found · BattleSphere',
    };
  }

  const { data: armyRows } = await admin
    .from('armies')
    .select('*')
    .eq('id', unit.army_id)
    .limit(1);
  const army = armyRows?.[0] ?? null;

  const titleParts = [unit.name];
  if (army?.name)         titleParts.push(army.name);
  if (army?.faction_name) titleParts.push(army.faction_name);

  const title = `${unit.name}${army?.name ? ` — ${army.name}` : ''} · BattleSphere`;

  // Prefer the unit's own description; fall back to a sensible default.
  const rawDesc = unit.description || army?.tagline ||
    `A unit from ${army?.name || 'a BattleSphere army'}${army?.faction_name ? ` (${army.faction_name})` : ''}.`;
  const description = rawDesc.length > 200
    ? rawDesc.slice(0, 197).trimEnd() + '…'
    : rawDesc;

  const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/units/${id}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type:      'article',
      siteName:  'BattleSphere',
      images: [{ url: ogImageUrl, width: 800, height: 419, type: 'image/png', alt: title }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function UnitPortraitPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Unit
  const { data: unitRows } = await admin
    .from('army_units')
    .select('*')
    .eq('id', id)
    .limit(1);
  const unit = unitRows?.[0] ?? null;
  if (!unit) notFound();

  // Army
  const { data: armyRows } = await admin
    .from('armies')
    .select('*')
    .eq('id', unit.army_id)
    .limit(1);
  const army = armyRows?.[0] ?? null;
  if (!army) notFound();

  // Respect army visibility: private armies only viewable by owner.
  if (!army.is_public && army.player_id !== user?.id) notFound();

  // Player profile
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, username')
    .eq('id', army.player_id)
    .limit(1);
  const profile = profileRows?.[0] ?? null;

  // Photos — portrait first (is_portrait DESC), then oldest first as fallback
  const { data: photos } = await admin
    .from('army_unit_photos')
    .select('*')
    .eq('unit_id', unit.id)
    .order('is_portrait', { ascending: false })
    .order('created_at', { ascending: true });

  // Crusade records (may appear in multiple campaigns)
  const { data: crusadeRecords } = await admin
    .from('crusade_unit_records')
    .select('*')
    .eq('army_unit_id', unit.id);

  // Campaign names for those records (via campaign_army_records → campaigns)
  let crusadeRows = [];
  if ((crusadeRecords || []).length > 0) {
    const carIds = crusadeRecords.map(r => r.campaign_army_record_id);
    const { data: cars } = await admin
      .from('campaign_army_records')
      .select('*')
      .in('id', carIds);
    const campaignIds = Array.from(new Set((cars || []).map(c => c.campaign_id)));
    const { data: campaigns } = campaignIds.length > 0
      ? await admin.from('campaigns').select('*').in('id', campaignIds)
      : { data: [] };
    const carMap      = Object.fromEntries((cars || []).map(c => [c.id, c]));
    const campaignMap = Object.fromEntries((campaigns || []).map(c => [c.id, c]));

    crusadeRows = crusadeRecords.map(r => {
      const car      = carMap[r.campaign_army_record_id];
      const campaign = car ? campaignMap[car.campaign_id] : null;
      return { record: r, campaign };
    }).filter(x => x.campaign);
  }

  const isOwner = user?.id === army.player_id;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '760px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {profile && (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{profile.username}</span>
            <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>›</span>
          </>
        )}
        <Link
          href={`/armies/${army.id}`}
          style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'none' }}
        >
          {army.name}
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{unit.name}</span>
      </nav>

      {/* Header — name + meta */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{
          fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
          fontWeight: '900',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '0.45rem',
          color: 'var(--text-primary)',
        }}>
          {unit.name}
        </h1>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link
            href={`/armies/${army.id}`}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.62rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              textDecoration: 'none',
            }}
          >
            {army.name}
          </Link>
          {army.faction_name && (
            <>
              <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>·</span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.58rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                {army.faction_name}
              </span>
            </>
          )}
          {unit.unit_type && (
            <>
              <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>·</span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.58rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                {unit.unit_type}
              </span>
            </>
          )}
          {profile && (
            <>
              <span style={{ color: 'var(--border-dim)', fontSize: '0.75rem' }}>·</span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.58rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                {profile.username}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Share / actions row */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <ShareUnitButton unitId={unit.id} hasPhoto={!!(photos?.[0])} unitName={unit.name} />
        {isOwner && (
          <Link href={`/armies/${army.id}/edit`}>
            <button className="btn-secondary" style={{ fontSize: '0.78rem' }}>Edit in Army</button>
          </Link>
        )}
      </div>

      {/* Portrait hero */}
      <UnitPortraitHero
        photo={photos?.[0] ?? null}
        unitName={unit.name}
        armyName={army.name}
      />

      {/* Description */}
      {unit.description && (
        <div style={{ border: '1px solid var(--border-dim)', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.6rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-gold)',
            marginBottom: '0.6rem',
          }}>
            Record
          </h2>
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}>
            {unit.description}
          </div>
        </div>
      )}

      {/* Crusade records */}
      {crusadeRows.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.6rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-gold)',
            marginBottom: '0.75rem',
          }}>
            Crusade Progress
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {crusadeRows.map(({ record, campaign }) => (
              <div key={record.id} style={{ border: '1px solid var(--border-dim)', padding: '0.8rem 1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <Link
                    href={`/c/${campaign.slug}`}
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.68rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-gold)',
                      textDecoration: 'none',
                    }}
                  >
                    {campaign.name}
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span><strong style={{ color: 'var(--text-primary)' }}>{record.experience_points}</strong> XP</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>{record.kills}</strong> Kills</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>{record.crusade_points}</strong> CP</span>
                </div>
                {record.upgrades && (
                  <p style={{ marginTop: '0.55rem', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Upgrades · </span>
                    {record.upgrades}
                  </p>
                )}
                {record.scars && (
                  <p style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Battle Scars · </span>
                    {record.scars}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Additional photos gallery */}
      <UnitPhotosViewer photos={(photos || []).slice(1)} />

      {/* Back link */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
        <Link href={`/armies/${army.id}`}>
          <button className="btn-secondary" style={{ fontSize: '0.78rem' }}>← Back to {army.name}</button>
        </Link>
      </div>
    </div>
  );
}
