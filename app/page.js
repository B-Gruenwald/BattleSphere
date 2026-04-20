import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '6rem 2rem 4rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background texture */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 50% 40%, rgba(183, 140, 64, 0.04) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 20% 80%, rgba(139, 26, 26, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 30% 30% at 80% 20%, rgba(139, 26, 26, 0.04) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
        }} />

        {/* Decorative rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', opacity: 0.5 }}>
          <div style={{ width: '60px', height: '1px', background: 'var(--gold)' }} />
          <div style={{ width: '6px', height: '6px', background: 'var(--gold)', transform: 'rotate(45deg)' }} />
          <div style={{ width: '60px', height: '1px', background: 'var(--gold)' }} />
        </div>

        <h1 className="hero-title" style={{
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
          fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '1.5rem',
        }}>
          Your campaign. Your group&apos;s story.
        </p>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          fontStyle: 'italic',
          color: 'var(--text-secondary)',
          maxWidth: '620px',
          marginBottom: '2.5rem',
          lineHeight: 1.7,
        }}>
          BattleSphere gives campaign organisers the tools to build a living Warhammer campaign —
          and gives every player a stake in how it unfolds. Set the stage. Fight the battles.
          Build the legend together.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {user ? (
            <Link href="/dashboard">
              <button className="btn-primary">Go to Dashboard</button>
            </Link>
          ) : (
            <>
              <Link href="/campaign/new">
                <button className="btn-primary">Create your campaign</button>
              </Link>
              <Link href="/login">
                <button className="btn-secondary">Sign In</button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── VISION ───────────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--border-dim)',
        padding: '4rem 2rem',
        maxWidth: '720px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.85,
          fontStyle: 'italic',
        }}>
          The best campaigns are more than a series of games. They&apos;re a shared story —
          one that grows richer with every battle fought, every territory lost, every twist
          the organiser throws at the table.
        </p>
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.85,
          fontStyle: 'italic',
          marginTop: '1.25rem',
        }}>
          BattleSphere is built for that kind of campaign.{' '}
          <span style={{ color: 'var(--text-gold)' }}>One organiser builds the world. Everyone writes the history.</span>
        </p>
      </section>

      {/* ── FEATURE BLOCKS ───────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--border-dim)',
        borderBottom: '1px solid var(--border-dim)',
        padding: '3rem 2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0',
        maxWidth: '1040px',
        margin: '0 auto',
      }}>
        {[
          {
            title: 'The Map',
            body: 'Build your campaign\'s world — place territories, name star systems, draw the warp routes your factions will fight over. As battles are fought and control shifts, the map updates in real time.',
          },
          {
            title: 'Campaign Events',
            body: 'Post events that reframe what\'s at stake — sudden assaults, shifting allegiances, sector-wide crises. Your players don\'t just show up to play. They show up to find out what happens next.',
          },
          {
            title: 'The Chronicle',
            body: 'Every battle, every event, every territory that changes hands — woven automatically into a living timeline. The Chronicle belongs to the whole group: a record of the war they fought together.',
          },
          {
            title: 'Hall of Honours',
            body: 'Bestow honours on players and factions for acts of brilliance, sacrifice, or infamy. These moments become part of the campaign\'s shared legend — the stories your group will still be telling long after the final battle.',
          },
        ].map((f, i, arr) => (
          <div key={i} style={{
            padding: '2.5rem 2rem',
            borderRight: i < arr.length - 1 ? '1px solid var(--border-dim)' : 'none',
            textAlign: 'center',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: 'var(--gold)',
              transform: 'rotate(45deg)',
              margin: '0 auto 1.25rem',
              opacity: 0.6,
            }} />
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.7rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '0.75rem',
            }}>
              {f.title}
            </h3>
            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              fontStyle: 'italic',
            }}>
              {f.body}
            </p>
          </div>
        ))}
      </section>

      {/* ── THE PITCH ────────────────────────────────────────────────── */}
      <section style={{
        padding: '5rem 2rem',
        maxWidth: '720px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        {/* Decorative rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', justifyContent: 'center', opacity: 0.4 }}>
          <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
          <div style={{ width: '5px', height: '5px', background: 'var(--gold)', transform: 'rotate(45deg)' }} />
          <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.75rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '1.5rem',
        }}>
          More than a league. A living campaign.
        </h2>

        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.85,
          fontStyle: 'italic',
          marginBottom: '1.25rem',
        }}>
          Running a campaign means giving your group&apos;s games a context that makes them matter.
          BattleSphere handles the organisation — the map, the standings, the history — so you
          can focus on the story.
        </p>
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.85,
          fontStyle: 'italic',
        }}>
          And your players bring that story to life every time they roll dice.
        </p>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--border-dim)',
        padding: '4rem 2rem',
        maxWidth: '720px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.75rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '3rem',
        }}>
          Up and running in minutes
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '2rem',
          textAlign: 'center',
        }}>
          {[
            {
              step: '01',
              heading: 'Create your campaign',
              body: 'Name it, build your map, set up factions and territories.',
            },
            {
              step: '02',
              heading: 'Invite your players',
              body: 'Share your campaign link. Players join, log their battles, and watch the map evolve.',
            },
            {
              step: '03',
              heading: 'Shape the narrative together',
              body: 'Post events, award honours, and let the campaign\'s history write itself.',
            },
          ].map((s, i) => (
            <div key={i} style={{ padding: '0 1rem' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: '900',
                color: 'var(--gold)',
                opacity: 0.25,
                letterSpacing: '0.08em',
                marginBottom: '0.75rem',
              }}>
                {s.step}
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.7rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-primary)',
                marginBottom: '0.6rem',
              }}>
                {s.heading}
              </h3>
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.65,
                fontStyle: 'italic',
              }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CLOSING CTA ──────────────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid var(--border-dim)',
        padding: '5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(ellipse 60% 60% at 50% 50%, rgba(183, 140, 64, 0.04) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.7rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '1.5rem',
          fontStyle: 'italic',
        }}>
          The campaign doesn&apos;t start at the table. It starts here.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {user ? (
            <Link href="/dashboard">
              <button className="btn-primary">Go to Dashboard</button>
            </Link>
          ) : (
            <>
              <Link href="/campaign/new">
                <button className="btn-primary">Create your campaign</button>
              </Link>
              <Link href="/login">
                <button className="btn-secondary">Sign In</button>
              </Link>
            </>
          )}
        </div>
      </section>

    </div>
  );
}
