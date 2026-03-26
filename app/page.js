export default function Home() {
  return (
    <>
      {/* ── Navigation ── */}
      <nav style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.2rem 3rem',
        borderBottom: '1px solid rgba(201,185,122,0.2)',
        backgroundColor: 'rgba(10,10,8,0.97)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.4rem',
          fontWeight: 900,
          letterSpacing: '0.15em',
          color: 'var(--gold)',
        }}>
          WAR<span style={{ color: 'var(--crimson)' }}>ZONES</span>
        </div>
        <div style={{ display: 'flex', gap: '2.5rem' }}>
          {['Features', 'Campaigns', 'Factions', 'Sign In'].map((item) => (
            <a key={item} href="#" style={{
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              color: 'rgba(201,185,122,0.45)',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
              transition: 'color 0.2s',
            }}>{item}</a>
          ))}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
      }}>
        {/* Corner frame decorations */}
        <div style={{
          position: 'absolute', top: '2.5rem', left: '2.5rem',
          width: 24, height: 24,
          borderTop: '1px solid rgba(201,185,122,0.4)',
          borderLeft: '1px solid rgba(201,185,122,0.4)',
        }} />
        <div style={{
          position: 'absolute', bottom: '2.5rem', right: '2.5rem',
          width: 24, height: 24,
          borderBottom: '1px solid rgba(201,185,122,0.4)',
          borderRight: '1px solid rgba(201,185,122,0.4)',
        }} />

        <p style={{
          fontSize: '0.65rem',
          letterSpacing: '0.45em',
          color: 'rgba(201,185,122,0.35)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
          marginBottom: '2rem',
        }}>
          // Campaign Intelligence Platform //
        </p>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3rem, 9vw, 7.5rem)',
          fontWeight: 900,
          lineHeight: 0.95,
          letterSpacing: '0.06em',
          color: 'var(--gold-bright)',
          marginBottom: '1.5rem',
        }}>
          <span style={{
            display: 'block',
            color: 'var(--crimson)',
            fontSize: '0.55em',
            letterSpacing: '0.35em',
            marginBottom: '0.25em',
            fontWeight: 600,
          }}>
            Enter the
          </span>
          WARZONE
        </h1>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
          fontSize: '1.25rem',
          color: 'rgba(201,185,122,0.5)',
          maxWidth: 540,
          lineHeight: 1.75,
          marginBottom: '3rem',
        }}>
          Organise narrative campaigns. Track territorial conquest. Chronicle the fall of empires — one battle at a time.
        </p>

        {/* Divider */}
        <div style={{
          width: 200, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(201,185,122,0.35), transparent)',
          marginBottom: '3rem',
        }} />

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="#" style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.7rem',
            letterSpacing: '0.25em',
            padding: '1rem 2.5rem',
            background: 'var(--crimson)',
            color: '#f0e8c0',
            textTransform: 'uppercase',
            clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
            display: 'inline-block',
            fontWeight: 600,
          }}>
            Begin Campaign
          </a>
          <a href="#" style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.7rem',
            letterSpacing: '0.25em',
            padding: '1rem 2.5rem',
            background: 'transparent',
            color: 'rgba(201,185,122,0.65)',
            border: '1px solid rgba(201,185,122,0.25)',
            textTransform: 'uppercase',
            display: 'inline-block',
            fontWeight: 400,
          }}>
            View the Maps
          </a>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '5rem 3rem',
        borderTop: '1px solid rgba(201,185,122,0.1)',
        backgroundColor: 'rgba(15,15,10,0.7)',
      }}>
        <p style={{
          textAlign: 'center',
          fontSize: '0.6rem',
          letterSpacing: '0.5em',
          color: 'rgba(201,185,122,0.28)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
          marginBottom: '3rem',
        }}>
          // Core Systems //
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 1,
          maxWidth: 900,
          margin: '0 auto',
          border: '1px solid rgba(201,185,122,0.1)',
        }}>
          {[
            { icon: '⬡', title: 'Campaign Maps', desc: 'Interactive territory maps. Configurable by scale, setting, and depth.' },
            { icon: '⊕', title: 'Faction Influence', desc: 'Territorial gains tracked across every engagement. The front lines never lie.' },
            { icon: '◈', title: 'Narrative Engine', desc: 'Events, achievements, and organiser tools to weave emergent stories.' },
            { icon: '⧖', title: 'Battle Records', desc: 'Every clash logged, every victory honoured, every defeat remembered.' },
          ].map((f) => (
            <div key={f.title} style={{
              padding: '2rem 1.5rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid rgba(201,185,122,0.07)',
            }}>
              <span style={{
                fontSize: '1.3rem',
                display: 'block',
                marginBottom: '1rem',
                opacity: 0.55,
              }}>{f.icon}</span>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.72rem',
                letterSpacing: '0.15em',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
                fontWeight: 600,
              }}>{f.title}</p>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                lineHeight: 1.65,
                color: 'rgba(201,185,122,0.38)',
              }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        padding: '2rem 3rem',
        borderTop: '1px solid rgba(201,185,122,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.85rem',
          letterSpacing: '0.15em',
          color: 'rgba(201,185,122,0.3)',
        }}>
          WAR<span style={{ color: 'rgba(204,34,34,0.4)' }}>ZONES</span>
        </span>
        <span style={{
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          color: 'rgba(201,185,122,0.2)',
          textTransform: 'uppercase',
        }}>
          // In the grim darkness of the far future, there is only war //
        </span>
      </footer>
    </>
  )
}
```

---

**To deploy:** Once you've pasted all three files, save them, then in your terminal run:
```
git add .
git commit -m "feat: landing page and visual identity"
git push