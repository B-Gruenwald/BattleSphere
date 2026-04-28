import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Army Portfolios · Admin · BattleSphere',
};

export default async function AdminArmies() {
  const supabase = createAdminClient();

  // All armies, most recently updated first
  const { data: armies } = await supabase
    .from('armies')
    .select('*')
    .order('updated_at', { ascending: false });

  const ownerIds = [...new Set((armies || []).map(a => a.player_id).filter(Boolean))];

  const { data: ownerProfiles } = ownerIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', ownerIds)
    : { data: [] };

  const ownerMap = Object.fromEntries((ownerProfiles || []).map(p => [p.id, p]));

  // All units — army_id + created_at for counting
  const { data: allUnits } = await supabase
    .from('army_units')
    .select('army_id, created_at');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();

  const unitCountMap = {};
  const recentUnitCountMap = {};
  (allUnits || []).forEach(u => {
    unitCountMap[u.army_id] = (unitCountMap[u.army_id] || 0) + 1;
    if (u.created_at >= cutoff) {
      recentUnitCountMap[u.army_id] = (recentUnitCountMap[u.army_id] || 0) + 1;
    }
  });

  const colHeaderStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.54rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  };

  const COLS = '2fr 1.2fr 100px 140px 130px 80px';

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
          Army Portfolios ({(armies || []).length})
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
          {['Army', 'Owner', 'Units', 'New (30 days)', 'Last Updated', ''].map(h => (
            <span key={h} style={colHeaderStyle}>{h}</span>
          ))}
        </div>

        {(armies || []).length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No army portfolios yet.
          </div>
        ) : (
          (armies || []).map(a => {
            const owner       = ownerMap[a.player_id];
            const unitCount   = unitCountMap[a.id] || 0;
            const recentCount = recentUnitCountMap[a.id] || 0;
            const updated     = a.updated_at
              ? new Date(a.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—';

            return (
              <div key={a.id} style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                gap: '1rem',
                padding: '0.9rem 1.25rem',
                borderBottom: '1px solid var(--border-dim)',
                alignItems: 'center',
              }}>
                {/* Army name + faction */}
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                    {a.name}
                  </div>
                  {a.faction && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {a.faction}
                    </div>
                  )}
                </div>

                {/* Owner username */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {owner?.username ?? '—'}
                </div>

                {/* Total units */}
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {unitCount}
                </div>

                {/* Units added in past 30 days */}
                <div style={{ fontSize: '0.9rem', textAlign: 'center' }}>
                  {recentCount > 0
                    ? <span style={{ color: 'var(--text-gold)', fontWeight: '600' }}>+{recentCount}</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>
                  }
                </div>

                {/* Last updated */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {updated}
                </div>

                {/* Link */}
                <div>
                  <Link href={`/armies/${a.id}`} style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.54rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-gold)',
                    textDecoration: 'none',
                  }}>
                    View ↗
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
