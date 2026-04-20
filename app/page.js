import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ── Demo links — swap placeholders before going live ─────────────────────────
// ARMY_DEMO_URL: the public URL to Benjamin's army portfolio page, e.g. /armies/[id]
// CAMPAIGN_DEMO_SLUG: the slug of the Vespator Front (or other demo) campaign
const ARMY_DEMO_URL      = '/armies/b0e70783-09ee-4eeb-9b99-9bd425ced524';
const CAMPAIGN_DEMO_SLUG = 'austriacus-subsector-93n4g';
const LEAGUE_DEMO_SLUG   = 'home-game-league-anpa6';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div style={{ color: 'var(--text-primary)' }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '6rem 2rem 4.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 50% 40%, rgba(183,140,64,0.05) 0%, transparent 65%),
            radial-gradient(ellipse 40% 40% at 15% 80%, rgba(139,26,26,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 30% 30% at 85% 20%, rgba(139,26,26,0.04) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
        }} />

        {/* Decorative rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', opacity: 0.45 }}>
          <div style={{ width: '60px', height: '1px', background: 'var(--gold)' }} />
          <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)' }} />
          <div style={{ width: '60px', height: '1px', background: 'var(--gold)' }} />
        </div>

        <h1 style={{
          fontSize: 'clamp(3rem, 8vw, 6.5rem)',
          fontWeight: '900',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '1.25rem',
          background: 'linear-gradient(180deg, var(--text-primary) 0%, var(--gold-dim) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.05,
        }}>
          BattleSphere
        </h1>

        <p style={{
          fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '1.5rem',
        }}>
          Played. Recorded. Remembered.
        </p>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.15rem)',
          fontStyle: 'italic',
          color: 'var(--text-secondary)',
          maxWidth: '600px',
          marginBottom: '2.5rem',
          lineHeight: 1.75,
        }}>
          A platform for wargamers who care about more than the final score —
          whether you want to document your collection, run a club league,
          or build a living narrative campaign.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/register">
            <button className="btn-primary">Get Started — It&apos;s Free</button>
          </Link>
          <Link href="/login">
            <button className="btn-secondary">Sign In</button>
          </Link>
        </div>
      </section>

      {/* ══ THREE PATHS ═══════════════════════════════════════════════════════ */}
      <section style={{
        borderTop: '1px solid var(--border-dim)',
        padding: '5rem 2rem',
        maxWidth: '1100px',
        margin: '0 auto',
      }}>
        {/* Section label */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          justifyContent: 'center',
          marginBottom: '3.5rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)', maxWidth: '160px' }} />
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.65rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            margin: 0,
          }}>
            Find your path
          </p>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)', maxWidth: '160px' }} />
        </div>

        {/* Path cards — separated by 1px gold-tinted borders */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '1px',
          background: 'var(--border-dim)',
          border: '1px solid var(--border-dim)',
        }}>

          {/* ── PATH 1: Your Army, Recorded ───────────────────────── */}
          <div style={{
            background: 'var(--bg-deep)',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
              opacity: 0.5,
            }} />

            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '1.25rem',
            }}>
              For the collector &amp; Crusade player
            </div>

            <h2 style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: '900',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              marginBottom: '1.25rem',
              lineHeight: 1.1,
            }}>
              Your Army,<br />Recorded
            </h2>

            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.75,
              fontStyle: 'italic',
              marginBottom: '1.25rem',
              flex: 1,
            }}>
              Build a portfolio for your painted force. Give every unit its own portrait
              page, track your Crusade roster, and share a link that looks the part.
              No group required — you can get value from BattleSphere tonight, on your own.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                'Army portfolio with photo galleries',
                'Unit portrait pages with shareable links',
                'Crusade roster — XP, kills, upgrades, scars',
                'Discord-ready share images for every unit',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ display: 'inline-block', width: '5px', height: '5px', background: 'var(--gold)', transform: 'rotate(45deg)', marginTop: '0.4rem', flexShrink: 0, opacity: 0.65 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>

            <Link href={ARMY_DEMO_URL} style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', letterSpacing: '0.08em' }}>
                See an example army →
              </button>
            </Link>
          </div>

          {/* ── PATH 2: Track your League ──────────────────────────── */}
          <div style={{
            background: 'var(--bg-deep)',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
              opacity: 0.5,
            }} />

            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '1.25rem',
            }}>
              For the club organiser
            </div>

            <h2 style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: '900',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              marginBottom: '1.25rem',
              lineHeight: 1.1,
            }}>
              Track your<br />League
            </h2>

            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.75,
              fontStyle: 'italic',
              marginBottom: '1.25rem',
              flex: 1,
            }}>
              Log results, watch standings evolve, and keep your club organised
              across a whole season. Simple enough to set up in an evening —
              polished enough to share with everyone.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                'Live league table — W/D/L/Pts standings',
                'Full battle history with results',
                'Chronicle of weekly hobby progress',
                'Public page to share with your club',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ display: 'inline-block', width: '5px', height: '5px', background: 'var(--gold)', transform: 'rotate(45deg)', marginTop: '0.4rem', flexShrink: 0, opacity: 0.65 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>

            <Link href={`/campaign/${LEAGUE_DEMO_SLUG}`} style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', letterSpacing: '0.08em' }}>
                See a live league →
              </button>
            </Link>
          </div>

          {/* ── PATH 3: Run a Campaign ─────────────────────────────── */}
          <div style={{
            background: 'var(--bg-deep)',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
              opacity: 0.5,
            }} />

            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '1.25rem',
            }}>
              For the narrative campaign organiser
            </div>

            <h2 style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: '900',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              marginBottom: '1.25rem',
              lineHeight: 1.1,
            }}>
              Run a<br />Campaign
            </h2>

            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.75,
              fontStyle: 'italic',
              marginBottom: '1.25rem',
              flex: 1,
            }}>
              Build a living world your group fights over. Interactive maps, territorial
              control, campaign events, a growing chronicle — everything you need to turn
              a series of games into a story your group will still be talking about next year.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                'Interactive SVG campaign map',
                'Territorial control & influence system',
                'Campaign events that reframe every battle',
                'Chronicle — a living history of the war',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ display: 'inline-block', width: '5px', height: '5px', background: 'var(--gold)', transform: 'rotate(45deg)', marginTop: '0.4rem', flexShrink: 0, opacity: 0.65 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>

            <Link href={`/campaign/${CAMPAIGN_DEMO_SLUG}`} style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', letterSpacing: '0.08em' }}>
                Explore a live campaign →
              </button>
            </Link>
          </div>

        </div>
      </section>

      {/* ══ TONE / POSITIONING ════════════════════════════════════════════════ */}
      <section style={{
        borderTop: '1px solid var(--border-dim)',
        padding: '4.5rem 2rem',
        maxWidth: '700px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem', opacity: 0.35 }}>
          <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
          <div style={{ width: '5px', height: '5px', background: 'var(--gold)', transform: 'rotate(45deg)' }} />
          <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
        </div>

        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '1.5rem',
        }}>
          System-agnostic. Free to use.
        </p>

        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.85,
          fontStyle: 'italic',
          marginBottom: '1.25rem',
        }}>
          BattleSphere is built for tabletop wargamers of all kinds — Warhammer 40,000,
          Age of Sigmar, Horus Heresy, and beyond. If your game involves dice, miniatures,
          and a story worth telling, it belongs here.
        </p>
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.85,
          fontStyle: 'italic',
        }}>
          No spreadsheets. No WhatsApp threads.{' '}
          <span style={{ color: 'var(--text-gold)' }}>Just the game, and the record of it.</span>
        </p>
      </section>

      {/* ══ CLOSING CTA ═══════════════════════════════════════════════════════ */}
      <section style={{
        borderTop: '1px solid var(--border-dim)',
        padding: '5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(ellipse 60% 60% at 50% 50%, rgba(183,140,64,0.04) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '1.5rem',
          fontStyle: 'italic',
        }}>
          Your hobby deserves a home
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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
