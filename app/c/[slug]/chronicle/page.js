import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const EVENT_TYPE_LABELS = {
  narrative:    'Narrative',
  mechanic:     'Game Mechanic',
  special_rule: 'Special Rule',
  mission:      'Mission',
};

const EVENT_STATUS_COLOURS = {
  upcoming: '#6a8fc7',
  active:   '#b78c40',
  resolved: '#5a5445',
};

// ── Helpers ────────────────────────────────────────────────────

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDateShort(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  });
}

// Group a flat sorted array into day-buckets
function groupByDay(entries) {
  const buckets = [];
  let currentDay = null;
  let currentGroup = null;

  for (const entry of entries) {
    const day = entry.sortKey.slice(0, 10); // YYYY-MM-DD
    if (day !== currentDay) {
      currentDay = day;
      currentGroup = { day, label: formatDate(entry.sortKey), entries: [] };
      buckets.push(currentGroup);
    }
    currentGroup.entries.push(entry);
  }
  return buckets;
}

// ── Subcomponents (rendered inline as functions per project convention) ────

function BattleEntry({ entry, slug }) {
  const { battle, factionMap, territoryMap } = entry;
  const attacker  = factionMap[battle.attacker_faction_id];
  const defender  = factionMap[battle.defender_faction_id];
  const winner    = factionMap[battle.winner_faction_id];
  const territory = battle.territory_id ? territoryMap[battle.territory_id] : null;
  const isDraw    = !battle.winner_faction_id;
  const attackerWon = battle.winner_faction_id === battle.attacker_faction_id;
  const resultLabel = isDraw
    ? 'Draw'
    : attackerWon
      ? `${attacker?.name ?? '?'} Victory`
      : `${defender?.name ?? '?'} Victory`;
  const resultColour = isDraw ? 'var(--text-muted)' : (winner?.colour ?? 'var(--text-gold)');
  const scoreStr = (battle.attacker_score != null && battle.defender_score != null)
    ? `${battle.attacker_score} – ${battle.defender_score}`
    : null;

  return (
    <Link href={`/c/${slug}/battle/${battle.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        display: 'flex',
        gap: '1.25rem',
        alignItems: 'flex-start',
        padding: '1.25rem 1.5rem',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-dim)',
        borderLeft: `3px solid ${resultColour}`,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}>
        {/* Icon column */}
        <div style={{ flexShrink: 0, paddingTop: '0.3rem' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L14 8L8 14L2 8Z" fill={resultColour} opacity="0.8"/>
          </svg>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Type label */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.52rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '0.3rem',
          }}>
            Battle{battle.battle_type ? ` · ${battle.battle_type}` : ''}
          </div>

          {/* Match headline */}
          <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.35rem' }}>
            {attacker?.name ?? '?'}
            <span style={{ color: 'var(--text-muted)', fontWeight: '400', margin: '0 0.5rem' }}>vs</span>
            {defender?.name ?? '?'}
          </div>

          {/* Result + meta */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.55rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: resultColour,
            }}>
              {resultLabel}
            </span>
            {scoreStr && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{scoreStr}</span>
            )}
            {territory && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {territory.name}
              </span>
            )}
          </div>

          {/* Chronicle excerpt */}
          {battle.chronicle && (
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontStyle: 'italic',
              marginTop: '0.6rem',
              lineHeight: 1.55,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {battle.chronicle}
            </p>
          )}
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center' }}>→</span>
      </div>
    </Link>
  );
}

function EventEntry({ entry, slug }) {
  const { ev } = entry;
  const statusColour = EVENT_STATUS_COLOURS[ev.status] ?? 'var(--text-muted)';

  return (
    <Link href={`/c/${slug}/events/${ev.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        display: 'flex',
        gap: '1.25rem',
        alignItems: 'flex-start',
        padding: '1.25rem 1.5rem',
        background: 'rgba(183,140,64,0.04)',
        border: '1px solid var(--border-dim)',
        borderLeft: `3px solid ${statusColour}`,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}>
        {/* Icon column */}
        <div style={{ flexShrink: 0, paddingTop: '0.2rem' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="1" fill={statusColour} opacity="0.7"/>
            <path d="M5 8H11M8 5V11" stroke="var(--bg-void)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Type + status label */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.52rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              Campaign Event · {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
            </span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.5rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: statusColour,
              border: `1px solid ${statusColour}40`,
              padding: '0.1rem 0.4rem',
            }}>
              {ev.status}
            </span>
          </div>

          {/* Title */}
          <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.35rem' }}>
            {ev.title}
          </div>

          {/* Body excerpt */}
          {ev.body && (
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontStyle: 'italic',
              lineHeight: 1.55,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {ev.body}
            </p>
          )}
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center' }}>→</span>
      </div>
    </Link>
  );
}

function AchievementEntry({ entry, slug }) {
  const { achievement, profileMap, factionMap } = entry;

  let recipientName = '?';
  if (achievement.awarded_to_type === 'player') {
    recipientName = profileMap[achievement.awarded_to_player_id]?.username ?? '?';
  } else if (achievement.awarded_to_type === 'faction') {
    recipientName = factionMap[achievement.awarded_to_faction_id]?.name ?? '?';
  }

  return (
    <Link href={`/c/${slug}/achievements`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        display: 'flex',
        gap: '1.25rem',
        alignItems: 'flex-start',
        padding: '1.25rem 1.5rem',
        background: 'rgba(183,140,64,0.06)',
        border: '1px solid var(--border-dim)',
        borderLeft: '3px solid var(--text-gold)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}>
        {/* Icon column */}
        <div style={{ flexShrink: 0, fontSize: '1.1rem', lineHeight: 1, paddingTop: '0.1rem' }}>
          {achievement.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Type label */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.52rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '0.3rem',
          }}>
            Achievement
          </div>

          {/* Title */}
          <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.35rem' }}>
            {achievement.title}
          </div>

          {/* Awarded to */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.55rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
            }}>
              Awarded to {recipientName}
            </span>
          </div>

          {/* Description excerpt */}
          {achievement.description && (
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontStyle: 'italic',
              marginTop: '0.6rem',
              lineHeight: 1.55,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {achievement.description}
            </p>
          )}
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center' }}>→</span>
      </div>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default async function ChroniclePage({ params }) {
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

  // Fetch all battles
  const { data: battles } = await supabase
    .from('battles')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Fetch all events
  const { data: events } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Fetch all achievements
  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('campaign_id', campaign.id);

  // Fetch factions + territories for battle rendering
  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id);

  const { data: territories } = await supabase
    .from('territories')
    .select('id, name')
    .eq('campaign_id', campaign.id);

  // Fetch profiles for achievement player recipients
  const achievementPlayerIds = [...new Set(
    (achievements || [])
      .filter(a => a.awarded_to_type === 'player' && a.awarded_to_player_id)
      .map(a => a.awarded_to_player_id)
  )];
  const { data: achievementProfiles } = achievementPlayerIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', achievementPlayerIds)
    : { data: [] };

  const factionMap        = Object.fromEntries((factions           || []).map(f => [f.id, f]));
  const territoryMap      = Object.fromEntries((territories        || []).map(t => [t.id, t]));
  const achievementProfileMap = Object.fromEntries((achievementProfiles || []).map(p => [p.id, p]));

  // Build unified timeline entries
  const battleEntries = (battles || []).map(b => ({
    type:    'battle',
    sortKey: b.created_at,
    battle:  b,
    factionMap,
    territoryMap,
  }));

  const eventEntries = (events || []).map(e => ({
    type:    'event',
    sortKey: e.created_at,
    ev:      e,
  }));

  const achievementEntries = (achievements || []).map(a => ({
    type:        'achievement',
    sortKey:     a.created_at,
    achievement: a,
    profileMap:  achievementProfileMap,
    factionMap,
  }));

  // Merge and sort newest first
  const timeline = [...battleEntries, ...eventEntries, ...achievementEntries]
    .sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey));

  const dayGroups = groupByDay(timeline);

  const { data: myMembership } = await supabase
    .from('campaign_members')
    .select('role')
    .eq('campaign_id', campaign.id)
    .eq('user_id', user.id)
    .single();
  const isOrganiser   = campaign.organiser_id === user.id
    || ['organiser', 'admin'].includes(myMembership?.role);
  const totalEntries  = timeline.length;

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
            Campaign Chronicle · {campaign.name}
          </p>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)', fontWeight: '900', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Chronicle
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.6rem', fontSize: '0.95rem' }}>
            A unified timeline of battles fought, events decreed, and honours bestowed.
          </p>
        </div>
        {isOrganiser && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href={`/c/${slug}/events/new`}>
              <button className="btn-secondary" style={{ fontSize: '0.6rem' }}>+ Post Event</button>
            </Link>
            <Link href={`/c/${slug}/battle/new`}>
              <button className="btn-primary" style={{ fontSize: '0.6rem' }}>+ Log Battle</button>
            </Link>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        padding: '0.75rem 1.25rem',
        background: 'var(--bg-deep)',
        border: '1px solid var(--border-dim)',
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '10px', height: '10px', background: 'var(--text-gold)', transform: 'rotate(45deg)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Battle</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '10px', height: '10px', background: '#b78c40', borderRadius: '2px' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Campaign Event</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>🏆</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Achievement</span>
        </div>
      </div>

      {/* Timeline */}
      {dayGroups.length === 0 ? (
        <div style={{ border: '1px solid var(--border-dim)', padding: '5rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--gold)', transform: 'rotate(45deg)', margin: '0 auto 1.5rem', opacity: 0.3 }} />
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1.5rem' }}>
            The chronicle is empty. Nothing has yet been recorded.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/c/${slug}/battle/new`}>
              <button className="btn-primary">Log a Battle</button>
            </Link>
            {isOrganiser && (
              <Link href={`/c/${slug}/events/new`}>
                <button className="btn-secondary">Post an Event</button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div>
          {dayGroups.map(group => (
            <div key={group.day} style={{ marginBottom: '2.5rem' }}>

              {/* Day header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
              }}>
                <div style={{ height: '1px', background: 'var(--border-dim)', width: '1.5rem', flexShrink: 0 }} />
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.58rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-gold)',
                  whiteSpace: 'nowrap',
                }}>
                  {group.label}
                </span>
                <div style={{ height: '1px', background: 'var(--border-dim)', flex: 1 }} />
              </div>

              {/* Entries for this day */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {group.entries.map((entry, i) => (
                  <div key={
                    entry.type === 'battle'      ? `b-${entry.battle.id}`
                    : entry.type === 'event'     ? `e-${entry.ev.id}`
                    : `a-${entry.achievement.id}`
                  }>
                    {entry.type === 'battle'
                      ? BattleEntry({ entry, slug })
                      : entry.type === 'event'
                        ? EventEntry({ entry, slug })
                        : AchievementEntry({ entry, slug })
                    }
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
