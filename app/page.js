import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const ARMY_DEMO_URL      = '/armies/b0e70783-09ee-4eeb-9b99-9bd425ced524';
const CAMPAIGN_DEMO_SLUG = 'austriacus-subsector-93n4g';
const LEAGUE_DEMO_SLUG   = 'home-game-league-anpa6';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div style={{ color: 'var(--text-primary)' }}>

      {/* ══ MASTHEAD ══════════════════════════════════════════════════════════
          Horizontal band: brand left, one-line pitch + CTAs right.
          Target height ~100px so cards are fully above the fold.        ══ */}
      <section style={{
        borderBottom: '1px solid var(--border-dim)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(ellipse 70% 200% at 30% 50%, rgba(183,140,64,0.04) 0%, transparent 60%),
            radial-gradient(ellipse 40% 200% at 80% 50%, rgba(139,26,26,0.05) 0%, transparent 60%)
          `,
        }} />

        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '1.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          flexWrap: 'wrap',
          position: 'relative',
        }}>

          {/* ── Left: brand ─────────────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{
                width: '8px', height: '8px',
                background: 'var(--gold)',
                transform: 'rotate(45deg)',
                opacity: 0.85, flexShrink: 0,
              }} />
              <h1 style={{
                fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                lineHeight: 1,
                background: 'linear-gradient(160deg, var(--text-primary) 40%, var(--gold-dim) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
              }}>
                BattleSphere
              </h1>
            </div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.62rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              margin: 0,
              paddingLeft: '1.45rem', // align with title text (past the diamond)
              opacity: 0.85,
            }}>
              Played · Recorded · Remembered
            </p>
          </div>

          {/* ── Right: pitch + CTAs ─────────────────────────────── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}>
            <p style={{
              fontSize: '0.9rem',
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              maxWidth: '340px',
              lineHeight: 1.55,
              margin: 0,
            }}>
              Document your collection, run a club league,
              or build a living narrative campaign.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
              <Link href="/register">
                <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1.25rem' }}>
                  Get Started
                </button>
              </Link>
              <Link href="/login">
                <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '0.55rem 1.25rem' }}>
                  Sign In
                </button>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ══ THREE PATHS ═══════════════════════════════════════════════════════
          Cards follow immediately — no section label, no extra padding gap. ══ */}
      <section style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '1.5rem 2rem 3.5rem',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '1px',
          background: 'var(--border-dim)',
          border: '1px solid var(--border-dim)',
        }}>

          {/* ── PATH 1: Your Army, Recorded ───────────────────── */}
          <div style={{
            background: 'var(--bg-deep)',
            padding: '1.75rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
              opacity: 0.5,
            }} />

            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.58rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '0.85rem',
              opacity: 0.85,
            }}>
              For the collector &amp; Crusade player
            </div>

            <h2 style={{
              fontSize: 'clamp(1.35rem, 2.5vw, 1.75rem)',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              marginBottom: '0.9rem',
              lineHeight: 1.1,
            }}>
              Your Army,<br />Recorded
            </h2>

            <p style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              fontStyle: 'italic',
              marginBottom: '1rem',
              flex: 1,
            }}>
              Build a portfolio for your painted force. Give every unit its own portrait page,
              track your Crusade roster, and share a link that looks the part.
              No group required — you can start tonight, on your own.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                'Army portfolio with photo galleries',
                'Unit portrait pages with shareable links',
                'Crusade roster — XP, kills, upgrades, scars',
                'Discord-ready share images for every unit',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
                  <span style={{ display: 'inline-block', width: '4px', height: '4px', background: 'var(--gold)', transform: 'rotate(45deg)', marginTop: '0.42rem', flexShrink: 0, opacity: 0.6 }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{item}</span>
                </li>
              ))}
            </ul>

            <Link href={ARMY_DEMO_URL} style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                See an example army →
              </button>
            </Link>
          </div>

          {/* ── PATH 2: Track your League ──────────────────────── */}
          <div style={{
            background: 'var(--bg-deep)',
            padding: '1.75rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
              opacity: 0.5,
            }} />

            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.58rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '0.85rem',
              opacity: 0.85,
            }}>
              For the club organiser
            </div>

            <h2 style={{
              fontSize: 'clamp(1.35rem, 2.5vw, 1.75rem)',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              marginBottom: '0.9rem',
              lineHeight: 1.1,
            }}>
              Track your<br />League
            </h2>

            <p style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              fontStyle: 'italic',
              marginBottom: '1rem',
              flex: 1,
            }}>
              Log results, watch standings evolve, and keep your club organised
              across a whole season. Simple enough to set up in an evening —
              polished enough to share with everyone.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                'Live league table — W/D/L/Pts standings',
                'Full battle history with results',
                'Chronicle of weekly hobby progress',
                'Public page to share with your club',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
                  <span style={{ display: 'inline-block', width: '4px', height: '4px', background: 'var(--gold)', transform: 'rotate(45deg)', marginTop: '0.42rem', flexShrink: 0, opacity: 0.6 }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{item}</span>
                </li>
              ))}
            </ul>

            <Link href={`/campaign/${LEAGUE_DEMO_SLUG}`} style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                See a live league →
              </button>
            </Link>
          </div>

          {/* ── PATH 3: Run a Campaign ─────────────────────────── */}
          <div style={{
            background: 'var(--bg-deep)',
            padding: '1.75rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
              opacity: 0.5,
            }} />

            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.58rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '0.85rem',
              opacity: 0.85,
            }}>
              For the narrative campaign organiser
            </div>

            <h2 style={{
              fontSize: 'clamp(1.35rem, 2.5vw, 1.75rem)',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              marginBottom: '0.9rem',
              lineHeight: 1.1,
            }}>
              Run a<br />Campaign
            </h2>

            <p style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              fontStyle: 'italic',
              marginBottom: '1rem',
              flex: 1,
            }}>
              Build a living world your group fights over. Interactive maps, territorial
              control, campaign events, a growing chronicle — everything you need to turn
              a series of games into a story your group will still be talking about.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                'Interactive SVG campaign map',
                'Territorial control & influence system',
                'Campaign events that reframe every battle',
                'Chronicle — a living history of the war',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
                  <span style={{ display: 'inline-block', width: '4px', height: '4px', background: 'var(--gold)', transform: 'rotate(45deg)', marginTop: '0.42rem', flexShrink: 0, opacity: 0.6 }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{item}</span>
                </li>
              ))}
            </ul>

            <Link href={`/campaign/${CAMPAIGN_DEMO_SLUG}`} style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                Explore a live campaign →
              </button>
            </Link>
          </div>

        </div>
      </section>

      {/* ══ POSITIONING LINE ══════════════════════════════════════════════════ */}
      <section style={{
        borderTop: '1px solid var(--border-dim)',
        padding: '3rem 2rem',
        maxWidth: '700px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.62rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '1.1rem',
          opacity: 0.8,
        }}>
          System-agnostic · Free to use
        </p>
        <p style={{
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.8,
          fontStyle: 'italic',
        }}>
          Built for Warhammer 40,000, Age of Sigmar, Horus Heresy, and beyond.
          If your game involves dice, miniatures, and a story worth telling —
          {' '}<span style={{ color: 'var(--text-gold)' }}>it belongs here.</span>
        </p>
      </section>

      {/* ══ CLOSING CTA ═══════════════════════════════════════════════════════ */}
      <section style={{
        borderTop: '1px solid var(--border-dim)',
        padding: '3rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(ellipse 60% 80% at 50% 50%, rgba(183,140,64,0.04) 0%, transparent 70%)`,
        }} />
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.62rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '1.25rem',
          fontStyle: 'italic',
        }}>
          Your hobby deserves a home
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/register">
            <button className="btn-primary">Create a free account</button>
          </Link>
          <Link href="/login">
            <button className="btn-secondary">Sign In</button>
          </Link>
        </div>
      </section>

    </div>
  );
}
