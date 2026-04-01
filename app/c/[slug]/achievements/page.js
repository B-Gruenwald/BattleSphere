import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DeleteAchievementButton from '@/app/components/DeleteAchievementButton';

export default async function AchievementsPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();
  if (!campaign) notFound();

  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false });

  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Collect all player IDs referenced in achievements
  const playerIds = [...new Set(
    (achievements || [])
      .filter(a => a.awarded_to_player_id)
      .map(a => a.awarded_to_player_id)
  )];
  const { data: playerProfiles } = playerIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', playerIds)
    : { data: [] };

  const factionMap = Object.fromEntries((factions || []).map(f => [f.id, f]));
  const profileMap = Object.fromEntries((playerProfiles || []).map(p => [p.id, p]));

  const isOrganiser = campaign.organiser_id === user.id;

  // Group by recipient
  const byFaction = {};
  const byPlayer  = {};
  for (const a of (achievements || [])) {
    if (a.awarded_to_type === 'faction' && a.awarded_to_faction_id) {
      if (!byFaction[a.awarded_to_faction_id]) byFaction[a.awarded_to_faction_id] = [];
      byFaction[a.awarded_to_faction_id].push(a);
    } else if (a.awarded_to_type === 'player' && a.awarded_to_player_id) {
      if (!byPlayer[a.awarded_to_player_id]) byPlayer[a.awarded_to_player_id] = [];
      byPlayer[a.awarded_to_player_id].push(a);
    }
  }

  const hasFactionAchievements = Object.keys(byFaction).length > 0;
  const hasPlayerAchievements  = Object.keys(byPlayer).length > 0;
  const totalCount = (achievements || []).length;

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '960px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
            Achievements · {campaign.name}
          </p>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)', fontWeight: '900', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Hall of Honours
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.6rem', fontSize: '0.95rem' }}>
            Milestones and distinctions earned across the campaign.
          </p>
        </div>
        {isOrganiser && (
          <Link href={`/c/${slug}/achievements/new`}>
            <button className="btn-primary">+ Award Achievement</button>
          </Link>
        )}
      </div>

      {/* Empty state */}
      {totalCount === 0 && (
        <div style={{ border: '1px solid var(--border-dim)', padding: '6rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>🏆</div>
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>
            No achievements have been awarded yet.
          </p>
          {isOrganiser && (
            <Link href={`/c/${slug}/achievements/new`}>
              <button className="btn-secondary" style={{ marginTop: '0.5rem' }}>Award the First Achievement</button>
            </Link>
          )}
        </div>
      )}

      {/* Faction achievements */}
      {hasFactionAchievements && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-dim)' }}>
            Faction Honours
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {Object.entries(byFaction).map(([fid, achs]) => {
              const faction = factionMap[fid];
              if (!faction) return null;
              return (
                <div key={fid} style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
                  {/* Faction label */}
                  <Link href={`/c/${slug}/faction/${fid}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                      <div style={{ width: '10px', height: '10px', background: faction.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: faction.colour }}>
                        {faction.name}
                      </span>
                    </div>
                  </Link>
                  {/* Achievement tiles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {achs.map(a => (
                      <AchievementTile key={a.id} achievement={a} isOrganiser={isOrganiser} slug={slug} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Player achievements */}
      {hasPlayerAchievements && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-dim)' }}>
            Player Honours
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {Object.entries(byPlayer).map(([pid, achs]) => {
              const profile = profileMap[pid];
              return (
                <div key={pid} style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
                  {/* Player label */}
                  <Link href={`/c/${slug}/player/${pid}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                      <div style={{ width: '22px', height: '22px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: '700', flexShrink: 0 }}>
                        {(profile?.username ?? '?').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        {profile?.username ?? 'Unknown Player'}
                      </span>
                    </div>
                  </Link>
                  {/* Achievement tiles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {achs.map(a => (
                      <AchievementTile key={a.id} achievement={a} isOrganiser={isOrganiser} slug={slug} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Achievement tile ───────────────────────────────────────────

function AchievementTile({ achievement: a, isOrganiser, slug }) {
  const date = new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.85rem',
      padding: '0.85rem',
      background: 'rgba(183,140,64,0.04)',
      border: '1px solid rgba(183,140,64,0.2)',
    }}>
      <span style={{ fontSize: '1.5rem', flexShrink: 0, lineHeight: 1 }}>{a.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
          {a.title}
        </div>
        {a.description && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.45 }}>
            {a.description}
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          {date}
        </div>
      </div>
      {isOrganiser && (
        <DeleteAchievementButton achievementId={a.id} slug={slug} />
      )}
    </div>
  );
}
