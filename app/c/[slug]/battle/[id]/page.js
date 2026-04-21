import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import PhotoGallery from '@/app/components/PhotoGallery';
import AddToCampaignPanel from '@/app/components/AddToCampaignPanel';
import ShareBattleButton from '@/app/components/ShareBattleButton';

// ── Dynamic metadata for Discord / social previews ──────────────────────────
export async function generateMetadata({ params }) {
  const { slug, id } = await params;
  const admin = createAdminClient();

  const { data: campRows } = await admin
    .from('campaigns').select('*').eq('slug', slug).limit(1);
  const campaign = campRows?.[0] ?? null;
  if (!campaign) return {};

  const { data: battleRows } = await admin
    .from('battles').select('*').eq('id', id).eq('campaign_id', campaign.id).limit(1);
  const battle = battleRows?.[0] ?? null;
  if (!battle) return {};

  const { data: factions } = await admin
    .from('factions').select('id, name').eq('campaign_id', campaign.id);
  const factionMap   = Object.fromEntries((factions || []).map(f => [f.id, f]));
  const attackerName = factionMap[battle.attacker_faction_id]?.name || 'Attacker';
  const defenderName = factionMap[battle.defender_faction_id]?.name || 'Defender';
  const winnerName   = factionMap[battle.winner_faction_id]?.name   || null;
  const isDraw       = !battle.winner_faction_id;
  const resultText   = isDraw ? 'Tactical Draw' : `${winnerName} Victory`;

  const title = battle.headline
    ? `${battle.headline} — ${campaign.name}`
    : `${attackerName} vs ${defenderName} — ${campaign.name}`;

  const description = `${resultText} · ${attackerName} vs ${defenderName}`
    + (battle.narrative ? ` · "${battle.narrative.slice(0, 80)}…"` : '');

  const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${slug}/battle/${id}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

// Render **bold** and *italic* markdown-style markup
function RichText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div>
      {lines.map((line, li) => {
        const parts = [];
        const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
        let last = 0, key = 0, match;
        while ((match = regex.exec(line)) !== null) {
          if (match.index > last) parts.push(<span key={key++}>{line.slice(last, match.index)}</span>);
          if (match[0].startsWith('**'))
            parts.push(<strong key={key++}>{match[0].slice(2, -2)}</strong>);
          else
            parts.push(<em key={key++}>{match[0].slice(1, -1)}</em>);
          last = match.index + match[0].length;
        }
        if (last < line.length) parts.push(<span key={key++}>{line.slice(last)}</span>);
        return <p key={li} style={{ margin: li > 0 ? '0.6rem 0 0' : '0' }}>{parts}</p>;
      })}
    </div>
  );
}

export default async function BattleDetailPage({ params }) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  // No login required — battle detail pages are publicly shareable.

  const { data: campaign } = await supabase
    .from('campaigns').select('*').eq('slug', slug).single();
  if (!campaign) notFound();

  const { data: battle } = await supabase
    .from('battles').select('*').eq('id', id).eq('campaign_id', campaign.id).single();
  if (!battle) notFound();

  const { data: factions } = await supabase
    .from('factions').select('*').eq('campaign_id', campaign.id);

  let territory = null;
  if (battle.territory_id) {
    const { data } = await supabase
      .from('territories').select('id, name, type').eq('id', battle.territory_id).single();
    territory = data;
  }

  const playerIds = [battle.attacker_player_id, battle.defender_player_id].filter(Boolean);
  const { data: profiles } = playerIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', playerIds)
    : { data: [] };

  const profileMap       = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const factionMap       = Object.fromEntries((factions  || []).map(f => [f.id, f]));
  const attackerFaction  = factionMap[battle.attacker_faction_id];
  const defenderFaction  = factionMap[battle.defender_faction_id];
  const winnerFaction    = factionMap[battle.winner_faction_id];
  const attackerPlayer   = profileMap[battle.attacker_player_id];
  const defenderPlayer   = profileMap[battle.defender_player_id];

  // Co-ownership: logger, attacker, defender, or campaign organiser may edit.
  // Anonymous visitors (user === null) cannot edit.
  const canEdit = !!user && (
    user.id === battle.logged_by          ||
    user.id === battle.attacker_player_id ||
    user.id === battle.defender_player_id ||
    user.id === campaign.organiser_id
  );

  const isDraw      = !battle.winner_faction_id;
  const attackerWon = battle.winner_faction_id === battle.attacker_faction_id;
  const resultLabel = isDraw ? 'Draw' : attackerWon
    ? `${attackerFaction?.name ?? '?'} Victory`
    : `${defenderFaction?.name ?? '?'} Victory`;
  const resultColour = isDraw ? 'var(--text-muted)' : (winnerFaction?.colour ?? 'var(--text-gold)');
  const hasScores    = battle.attacker_score > 0 || battle.defender_score > 0;

  const date = new Date(battle.created_at).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Photos
  const { data: battlePhotos } = await supabase
    .from('battle_photos')
    .select('*')
    .eq('battle_id', id)
    .order('created_at', { ascending: true });

  // Event bonuses applied to this battle (Tier 2)
  const { data: eventBonusRows } = await supabase
    .from('battle_event_bonuses')
    .select('*, campaign_events(title, influence_bonus)')
    .eq('battle_id', id);

  // Territory cascade bonuses applied to this battle (Tier 3)
  const { data: cascadeBonusRows } = await supabase
    .from('battle_cascade_bonuses')
    .select('*, campaign_events(title), territories(name)')
    .eq('battle_id', id);

  // Cross-campaign links: source battle (if this is a copy) + linked copies (if this is the original)
  let sourceCampaign = null;
  if (battle.source_battle_id) {
    const { data: sourceRows } = await supabase
      .from('battles')
      .select('id, campaign_id')
      .eq('id', battle.source_battle_id)
      .limit(1);
    const sourceBattle = sourceRows?.[0] ?? null;
    if (sourceBattle) {
      const { data: sCampRows } = await supabase
        .from('campaigns')
        .select('id, name, slug')
        .eq('id', sourceBattle.campaign_id)
        .limit(1);
      sourceCampaign = sCampRows?.[0] ?? null;
    }
  }

  const { data: linkedBattleRows } = await supabase
    .from('battles')
    .select('id, campaign_id')
    .eq('source_battle_id', id);

  let linkedCampaigns = [];
  if (linkedBattleRows && linkedBattleRows.length > 0) {
    const linkedCampaignIds = [...new Set(linkedBattleRows.map(r => r.campaign_id))];
    const { data: linkedCampData } = await supabase
      .from('campaigns')
      .select('id, name, slug')
      .in('id', linkedCampaignIds);
    // Pair each campaign with the linked battle id
    linkedCampaigns = (linkedCampData || []).map(c => {
      const lb = linkedBattleRows.find(r => r.campaign_id === c.id);
      return { ...c, linkedBattleId: lb?.id ?? null };
    });
  }

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link href={`/c/${slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
          {campaign.name}
        </Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        {territory ? (
          <>
            <Link href={`/c/${slug}/territory/${territory.id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
              {territory.name}
            </Link>
            <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
          </>
        ) : null}
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Battle Record</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
            Battle Record · {date}
          </p>
          {battle.battle_type && (
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--text-secondary)',
              border: '1px solid var(--border-dim)', padding: '0.2rem 0.6rem',
            }}>
              {battle.battle_type}
            </span>
          )}
          {battle.scenario && (
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
              border: '1px solid var(--border-dim)', padding: '0.2rem 0.6rem',
            }}>
              {battle.scenario}
            </span>
          )}
        </div>
        {battle.headline ? (
          <>
            <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              {battle.headline}
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {attackerFaction?.name ?? '?'} <span style={{ color: 'var(--text-muted)' }}>vs</span> {defenderFaction?.name ?? '?'}
            </p>
          </>
        ) : (
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            {attackerFaction?.name ?? '?'} <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs</span> {defenderFaction?.name ?? '?'}
          </h1>
        )}

        {/* Result badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.5rem 1.25rem', border: `1px solid ${resultColour}`, background: `${resultColour}18`,
        }}>
          <div style={{ width: '8px', height: '8px', background: resultColour, transform: 'rotate(45deg)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: resultColour }}>
            {resultLabel}
          </span>
          {hasScores && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.25rem' }}>
              {battle.attacker_score} – {battle.defender_score}
            </span>
          )}
        </div>
      </div>

      {/* Share row */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem', marginBottom: '1.75rem' }}>
        <ShareBattleButton
          battleUrl={`${process.env.NEXT_PUBLIC_APP_URL}/c/${slug}/battle/${id}`}
        />
      </div>

      <div style={{ borderTop: '1px solid var(--border-dim)', marginBottom: '2.5rem' }} />

      {/* Player cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

        {/* Attacker */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Attacker {attackerWon && !isDraw ? '· Victory' : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '10px', height: '10px', background: attackerFaction?.colour || 'var(--border-dim)', transform: 'rotate(45deg)', flexShrink: 0 }} />
            <span style={{ fontSize: '1rem', fontWeight: '700', color: attackerWon && !isDraw ? attackerFaction?.colour : 'var(--text-primary)' }}>
              {attackerFaction?.name ?? 'Unknown Faction'}
            </span>
          </div>
          {attackerPlayer && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Commanded by {attackerPlayer.username}
            </p>
          )}
          {battle.attacker_army_type && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>
              {battle.attacker_army_type}
            </p>
          )}
          {hasScores && (
            <p style={{ color: 'var(--text-gold)', fontSize: '1.25rem', fontWeight: '700', marginTop: '0.75rem' }}>
              {battle.attacker_score} pts
            </p>
          )}
        </div>

        {/* Defender */}
        <div style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Defender {!attackerWon && !isDraw ? '· Victory' : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '10px', height: '10px', background: defenderFaction?.colour || 'var(--border-dim)', transform: 'rotate(45deg)', flexShrink: 0 }} />
            <span style={{ fontSize: '1rem', fontWeight: '700', color: !attackerWon && !isDraw ? defenderFaction?.colour : 'var(--text-primary)' }}>
              {defenderFaction?.name ?? 'Unknown Faction'}
            </span>
          </div>
          {defenderPlayer && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Commanded by {defenderPlayer.username}
            </p>
          )}
          {battle.defender_army_type && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>
              {battle.defender_army_type}
            </p>
          )}
          {hasScores && (
            <p style={{ color: 'var(--text-gold)', fontSize: '1.25rem', fontWeight: '700', marginTop: '0.75rem' }}>
              {battle.defender_score} pts
            </p>
          )}
        </div>

        {/* Territory */}
        {territory && (
          <div style={{ border: '1px solid var(--border-dim)', padding: '1.5rem' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Theatre of War
            </p>
            <Link href={`/c/${slug}/territory/${territory.id}`} style={{ textDecoration: 'none' }}>
              <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{territory.name}</p>
              {territory.type && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{territory.type}</p>}
              <p style={{ color: 'var(--text-gold)', fontSize: '0.8rem', marginTop: '0.5rem' }}>View territory →</p>
            </Link>
          </div>
        )}

        {/* Event bonuses (Tier 2) */}
        {eventBonusRows && eventBonusRows.length > 0 && (
          <div style={{ border: '1px solid rgba(183,140,64,0.3)', background: 'rgba(183,140,64,0.06)', padding: '1.5rem' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
              Event Bonus
            </p>
            {eventBonusRows.map(row => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-gold)' }}>
                  +{row.bonus_amount}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  influence &amp; XP — <em>{row.campaign_events?.title ?? 'Campaign Event'}</em>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Territory Cascade bonuses (Tier 3) */}
        {cascadeBonusRows && cascadeBonusRows.length > 0 && (
          <div style={{ border: '1px solid rgba(183,140,64,0.3)', background: 'rgba(183,140,64,0.06)', padding: '1.5rem' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
              Territory Cascade
            </p>
            {cascadeBonusRows.map(row => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-gold)' }}>
                  +{row.bonus_amount}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  influence in <em>{row.territories?.name ?? 'territory'}</em> — <em>{row.campaign_events?.title ?? 'Campaign Event'}</em>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Army Lists */}
      {(battle.attacker_army_list || battle.defender_army_list) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
            Army Lists
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {battle.attacker_army_list && (
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                  {attackerFaction?.name ?? 'Attacker'}
                </p>
                <pre style={{
                  color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)',
                  padding: '1rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'monospace', maxHeight: '320px', overflowY: 'auto', margin: 0,
                }}>
                  {battle.attacker_army_list}
                </pre>
              </div>
            )}
            {battle.defender_army_list && (
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                  {defenderFaction?.name ?? 'Defender'}
                </p>
                <pre style={{
                  color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)',
                  padding: '1rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'monospace', maxHeight: '320px', overflowY: 'auto', margin: 0,
                }}>
                  {battle.defender_army_list}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-player Chronicles */}
      {(battle.attacker_narrative || battle.defender_narrative) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.25rem' }}>
            Battle Chronicles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {battle.attacker_narrative && (
              <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {attackerPlayer ? `${attackerPlayer.username}'s Account` : `${attackerFaction?.name ?? 'Attacker'}'s Account`}
                </p>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontStyle: 'italic', fontSize: '0.95rem' }}>
                  <RichText text={battle.attacker_narrative} />
                </div>
              </div>
            )}
            {battle.defender_narrative && (
              <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {defenderPlayer ? `${defenderPlayer.username}'s Account` : `${defenderFaction?.name ?? 'Defender'}'s Account`}
                </p>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontStyle: 'italic', fontSize: '0.95rem' }}>
                  <RichText text={battle.defender_narrative} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy general chronicle (backward compat) */}
      {battle.narrative && (
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem', marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1rem' }}>
            Battle Chronicle
          </h2>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontStyle: 'italic', fontSize: '0.95rem' }}>
            <RichText text={battle.narrative} />
          </div>
        </div>
      )}

      {/* Photos */}
      <PhotoGallery
        photos={battlePhotos || []}
        entityType="battle"
        entityId={id}
        userId={user?.id ?? null}
        canUpload={canEdit}
        canManage={canEdit}
      />

      {/* Cross-campaign links */}
      {(sourceCampaign || linkedCampaigns.length > 0) && (
        <div style={{
          marginBottom: '2rem',
          padding: '1rem 1.25rem',
          background: 'rgba(183,140,64,0.04)',
          border: '1px solid var(--border-dim)',
          borderLeft: '3px solid var(--text-gold)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.55rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-gold)',
            marginBottom: '0.25rem',
          }}>
            Multi-Campaign Record
          </p>
          {sourceCampaign && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Originally fought in{' '}
              <Link href={`/c/${sourceCampaign.slug}`} style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>
                {sourceCampaign.name}
              </Link>
            </p>
          )}
          {linkedCampaigns.map(lc => (
            <p key={lc.id} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Also recorded in{' '}
              <Link href={`/c/${lc.slug}/battle/${lc.linkedBattleId}`} style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>
                {lc.name}
              </Link>
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Link href={`/c/${slug}`}>
          <button className="btn-secondary">← Campaign Dashboard</button>
        </Link>
        {territory && (
          <Link href={`/c/${slug}/territory/${territory.id}`}>
            <button className="btn-secondary">View Territory</button>
          </Link>
        )}
        {canEdit && (
          <Link href={`/c/${slug}/battle/${id}/edit`}>
            <button className="btn-secondary">Edit Battle</button>
          </Link>
        )}
        {/* Show link-to-campaign button only to participants and only if not itself a linked copy */}
        {user && (user.id === battle.attacker_player_id || user.id === battle.defender_player_id) && (
          <AddToCampaignPanel battleId={id} />
        )}
      </div>
    </div>
  );
}
