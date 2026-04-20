import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'All Battles · Admin · BattleSphere',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtResult(result) {
  if (!result) return '—';
  if (result === 'attacker_wins') return 'Attacker wins';
  if (result === 'defender_wins') return 'Defender wins';
  if (result === 'draw') return 'Draw';
  return result;
}

export default async function AdminBattles() {
  const supabase = createAdminClient();

  // All battles, newest first
  const { data: battles } = await supabase
    .from('battles')
    .select('*')
    .order('created_at', { ascending: false });

  // Campaigns (for name + slug lookup)
  const campaignIds = [...new Set((battles || []).map(b => b.campaign_id).filter(Boolean))];
  const { data: campaigns } = campaignIds.length > 0
    ? await supabase.from('campaigns').select('id, name, slug').in('id', campaignIds)
    : { data: [] };

  // Profiles (for attacker + defender username lookup)
  const playerIds = [...new Set([
    ...(battles || []).map(b => b.attacker_player_id),
    ...(battles || []).map(b => b.defender_player_id),
  ].filter(Boolean))];
  const { data: profiles } = playerIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', playerIds)
    : { data: [] };

  const campaignById = Object.fromEntries((campaigns || []).map(c => [c.id, c]));
  const profileById  = Object.fromEntries((profiles  || []).map(p => [p.id, p]));

  const colHeaderStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.54rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  };

  const COLS = '1.6fr 1.1fr 1.1fr 110px 130px 80px';

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.58rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#e05a5a',
          marginBottom: '0.5rem',
        }}>
          Platform Administration
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '700' }}>
          All Battles ({(battles || []).length})
        </h1>
      </div>

      <div style={{ border: '1px solid var(--border-dim)' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: COLS,
          gap: '1rem',
          padding: '0.7rem 1.25rem',
          borderBottom: '1px solid var(--border-dim)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          {['Campaign', 'Attacker', 'Defender', 'Result', 'Date', ''].map(h => (
            <span key={h} style={colHeaderStyle}>{h}</span>
          ))}
        </div>

        {(battles || []).length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No battles found.
          </div>
        ) : (
          (battles || []).map(b => {
            const campaign = campaignById[b.campaign_id];
            const attacker = profileById[b.attacker_player_id];
            const defender = profileById[b.defender_player_id];

            return (
              <div key={b.id} style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                gap: '1rem',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid var(--border-dim)',
                alignItems: 'center',
              }}>
                {/* Campaign name */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {campaign?.name ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                </div>

                {/* Attacker */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {attacker?.username ?? '—'}
                </div>

                {/* Defender */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {defender?.username ?? '—'}
                </div>

                {/* Result */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {fmtResult(b.result)}
                </div>

                {/* Date */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {fmtDate(b.created_at)}
                </div>

                {/* View link */}
                <div>
                  {campaign ? (
                    <Link href={`/c/${campaign.slug}/battle/${b.id}`} style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.54rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#e05a5a',
                      textDecoration: 'none',
                    }}>
                      View →
                    </Link>
                  ) : (
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
