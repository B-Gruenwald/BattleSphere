// app/admin/page.js
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Super Admin — BattleSphere' }

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtResult(result) {
  if (!result) return '—'
  if (result === 'attacker_wins') return 'Attacker wins'
  if (result === 'defender_wins') return 'Defender wins'
  if (result === 'draw') return 'Draw'
  return result
}

// ─── styles ─────────────────────────────────────────────────────────────────

const S = {
  page: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    color: 'var(--color-text-primary)',
  },
  heading: {
    fontSize: '1.75rem',
    fontFamily: 'var(--font-display)',
    color: 'var(--color-gold)',
    marginBottom: '0.25rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  subheading: {
    fontSize: '1.1rem',
    fontFamily: 'var(--font-display)',
    color: 'var(--color-gold)',
    marginBottom: '1rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: '3rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '0.5rem',
  },
  count: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    background: 'var(--color-surface-2)',
    padding: '0.2rem 0.5rem',
    borderRadius: '12px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    background: 'var(--color-surface-2)',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: '0.6rem 0.75rem',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle',
  },
  trHover: {
    background: 'var(--color-surface-hover)',
  },
  link: {
    color: 'var(--color-gold)',
    textDecoration: 'none',
    fontWeight: '500',
  },
  linkMuted: {
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
    fontSize: '0.8rem',
  },
  badge: {
    display: 'inline-block',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    fontSize: '0.72rem',
    fontWeight: '600',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  adminBadge: {
    background: '#4a1a1a',
    color: '#f87171',
    border: '1px solid #7f1d1d',
  },
  publicBadge: {
    background: 'rgba(183,140,64,0.15)',
    color: 'var(--color-gold)',
    border: '1px solid rgba(183,140,64,0.3)',
  },
  privateBadge: {
    background: 'var(--color-surface-2)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
  },
  announcementsLink: {
    display: 'inline-block',
    marginBottom: '2rem',
    padding: '0.5rem 1rem',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-gold)',
    textDecoration: 'none',
    fontSize: '0.875rem',
  },
  emptyRow: {
    padding: '1rem 0.75rem',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    fontSize: '0.875rem',
  },
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function SuperAdminPage() {
  // ── auth guard ──
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: selfProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1)
  if (!selfProfile?.[0]?.is_admin) redirect('/')

  // ── fetch all data ──
  const admin = createAdminClient()

  const [
    { data: campaigns },
    { data: profiles },
    { data: battles },
    { data: members },
  ] = await Promise.all([
    admin.from('campaigns').select('*').order('created_at', { ascending: false }),
    admin.from('profiles').select('*').order('created_at', { ascending: false }),
    admin.from('battles').select('*').order('created_at', { ascending: false }),
    admin.from('campaign_members').select('*'),
  ])

  // ── build lookup maps ──
  const campaignById = {}
  for (const c of (campaigns || [])) campaignById[c.id] = c

  const profileById = {}
  for (const p of (profiles || [])) profileById[p.id] = p

  // For each user, track the slug of the first campaign they belong to
  // (used to build a player-profile link in user table)
  const userFirstCampaignSlug = {}
  for (const m of (members || [])) {
    if (!userFirstCampaignSlug[m.user_id] && campaignById[m.campaign_id]) {
      userFirstCampaignSlug[m.user_id] = campaignById[m.campaign_id].slug
    }
  }

  return (
    <div style={S.page}>
      <h1 style={S.heading}>Super Admin</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Platform overview — visible to super-admins only.
      </p>

      <Link href="/admin/announcements" style={S.announcementsLink}>
        📣 Platform Announcements →
      </Link>

      {/* ── CAMPAIGNS ─────────────────────────────────────────── */}
      <section style={S.section}>
        <div style={S.sectionHeader}>
          <h2 style={{ ...S.subheading, marginBottom: 0 }}>Campaigns</h2>
          <span style={S.count}>{campaigns?.length ?? 0}</span>
        </div>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Name</th>
              <th style={S.th}>Slug</th>
              <th style={S.th}>Visibility</th>
              <th style={S.th}>Members</th>
              <th style={S.th}>Battles</th>
              <th style={S.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {!campaigns?.length && (
              <tr><td colSpan={6} style={S.emptyRow}>No campaigns found.</td></tr>
            )}
            {campaigns?.map(c => {
              const memberCount = (members || []).filter(m => m.campaign_id === c.id).length
              const battleCount = (battles || []).filter(b => b.campaign_id === c.id).length
              return (
                <tr key={c.id}>
                  <td style={S.td}>
                    <Link href={`/c/${c.slug}`} style={S.link}>
                      {c.name}
                    </Link>
                  </td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {c.slug}
                  </td>
                  <td style={S.td}>
                    <span style={{ ...S.badge, ...(c.is_public ? S.publicBadge : S.privateBadge) }}>
                      {c.is_public ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td style={{ ...S.td, color: 'var(--color-text-secondary)' }}>{memberCount}</td>
                  <td style={{ ...S.td, color: 'var(--color-text-secondary)' }}>{battleCount}</td>
                  <td style={{ ...S.td, color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{fmtDate(c.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* ── USERS ─────────────────────────────────────────────── */}
      <section style={S.section}>
        <div style={S.sectionHeader}>
          <h2 style={{ ...S.subheading, marginBottom: 0 }}>Users</h2>
          <span style={S.count}>{profiles?.length ?? 0}</span>
        </div>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Username</th>
              <th style={S.th}>Role</th>
              <th style={S.th}>Campaigns</th>
              <th style={S.th}>Joined</th>
              <th style={S.th}>Profile</th>
            </tr>
          </thead>
          <tbody>
            {!profiles?.length && (
              <tr><td colSpan={5} style={S.emptyRow}>No users found.</td></tr>
            )}
            {profiles?.map(p => {
              const campaignCount = (members || []).filter(m => m.user_id === p.id).length
              const firstSlug = userFirstCampaignSlug[p.id]
              return (
                <tr key={p.id}>
                  <td style={S.td}>
                    <span style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>
                      {p.username || '—'}
                    </span>
                  </td>
                  <td style={S.td}>
                    {p.is_admin
                      ? <span style={{ ...S.badge, ...S.adminBadge }}>Admin</span>
                      : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Player</span>
                    }
                  </td>
                  <td style={{ ...S.td, color: 'var(--color-text-secondary)' }}>{campaignCount}</td>
                  <td style={{ ...S.td, color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{fmtDate(p.created_at)}</td>
                  <td style={S.td}>
                    {firstSlug
                      ? (
                        <Link href={`/c/${firstSlug}/player/${p.id}`} style={S.link}>
                          View →
                        </Link>
                      )
                      : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No campaign</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* ── BATTLES ────────────────────────────────────────────── */}
      <section style={S.section}>
        <div style={S.sectionHeader}>
          <h2 style={{ ...S.subheading, marginBottom: 0 }}>Battles</h2>
          <span style={S.count}>{battles?.length ?? 0}</span>
        </div>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Campaign</th>
              <th style={S.th}>Attacker</th>
              <th style={S.th}>Defender</th>
              <th style={S.th}>Result</th>
              <th style={S.th}>Date</th>
              <th style={S.th}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {!battles?.length && (
              <tr><td colSpan={6} style={S.emptyRow}>No battles found.</td></tr>
            )}
            {battles?.map(b => {
              const campaign = campaignById[b.campaign_id]
              const attacker = profileById[b.attacker_player_id]
              const defender = profileById[b.defender_player_id]
              return (
                <tr key={b.id}>
                  <td style={S.td}>
                    {campaign
                      ? (
                        <Link href={`/c/${campaign.slug}`} style={S.linkMuted}>
                          {campaign.name}
                        </Link>
                      )
                      : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    }
                  </td>
                  <td style={{ ...S.td, color: 'var(--color-text-secondary)' }}>
                    {attacker?.username || '—'}
                  </td>
                  <td style={{ ...S.td, color: 'var(--color-text-secondary)' }}>
                    {defender?.username || '—'}
                  </td>
                  <td style={S.td}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {fmtResult(b.result)}
                    </span>
                  </td>
                  <td style={{ ...S.td, color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {fmtDate(b.created_at)}
                  </td>
                  <td style={S.td}>
                    {campaign
                      ? (
                        <Link href={`/c/${campaign.slug}/battle/${b.id}`} style={S.link}>
                          View →
                        </Link>
                      )
                      : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
