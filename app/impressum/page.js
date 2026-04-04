export const metadata = {
  title: 'Legal Notice — BattleSphere',
  description: 'Legal notice and operator information for BattleSphere.',
};

export default function ImpressumPage() {
  return (
    <div style={{
      maxWidth: '760px',
      margin: '0 auto',
      padding: '3rem 1.5rem 5rem',
    }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1.5rem',
        marginBottom: '2.5rem',
      }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.7rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: '0.5rem',
        }}>
          BattleSphere
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          letterSpacing: '0.04em',
        }}>
          Legal Notice
        </h1>
      </header>

      <p style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-subtle)',
        borderLeft: '3px solid var(--gold-dim)',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius)',
        marginBottom: '2rem',
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
      }}>
        Information required under § 5 of the Austrian E-Commerce Act (ECG) and § 25 of
        the Austrian Media Act (MedienG).
      </p>

      <Section title="Operator & Responsible Party">
        <p>Benjamin Gruenwald</p>
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          [Address to be added before public launch]
        </p>
        <p>Austria</p>
      </Section>

      <Section title="Contact">
        <p>
          Email:{' '}
          <a href="mailto:benjamin.gruenwald@outlook.com" style={{ color: 'var(--gold)' }}>
            benjamin.gruenwald@outlook.com
          </a>
        </p>
      </Section>

      <Section title="Purpose of this Website">
        <p>
          BattleSphere is a non-commercial platform for tabletop wargaming communities to
          organise, track, and narrate map-based campaigns. The platform is operated as a
          private project by Benjamin Gruenwald.
        </p>
      </Section>

      <Section title="Copyright">
        <p>
          All content on this website — including text, graphics, logos, interface design,
          and original code — is the intellectual property of Benjamin Gruenwald and is
          protected under Austrian and international copyright law. Reproduction,
          distribution, or use of any content without prior written permission is
          prohibited.
        </p>
        <p style={{ marginTop: '0.8rem' }}>
          User-generated content (such as campaign descriptions, battle chronicles, and
          event posts) remains the intellectual property of the respective users. By
          submitting content to BattleSphere, users grant Benjamin Gruenwald a
          non-exclusive, royalty-free licence to store and display that content within
          the platform.
        </p>
        <p style={{ marginTop: '0.8rem' }}>
          © {new Date().getFullYear()} Benjamin Gruenwald. All rights reserved.
        </p>
      </Section>

      <Section title="Disclaimer — Liability for Content">
        <p>
          The content of this website has been compiled with the utmost care. However,
          we cannot guarantee the accuracy, completeness, or timeliness of the information
          provided. As a private service provider, we are responsible for our own content
          on these pages in accordance with general law. We are not obliged to monitor
          transmitted or stored third-party information or to investigate circumstances
          that indicate illegal activity.
        </p>
      </Section>

      <Section title="Disclaimer — External Links">
        <p>
          This website may contain links to external third-party websites. We have no
          influence over the content of those sites and therefore cannot accept any
          liability for them. The respective provider or operator of linked pages is always
          responsible for their content. Should we become aware of any legal violations,
          we will remove such links immediately.
        </p>
      </Section>

      <Section title="Online Dispute Resolution">
        <p>
          The European Commission provides a platform for online dispute resolution (ODR)
          at{' '}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--gold)' }}
          >
            ec.europa.eu/consumers/odr
          </a>
          . Our contact address for this purpose is{' '}
          <a href="mailto:benjamin.gruenwald@outlook.com" style={{ color: 'var(--gold)' }}>
            benjamin.gruenwald@outlook.com
          </a>
          . We are not obliged or willing to participate in dispute resolution proceedings
          before a consumer arbitration board.
        </p>
      </Section>

      {/* Footer nav */}
      <div style={{
        marginTop: '3rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-dim)',
        display: 'flex',
        gap: '2rem',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
      }}>
        <span>Last updated: April 2026</span>
        <a href="/privacy-policy" style={{ color: 'var(--gold)' }}>Privacy Policy →</a>
      </div>

    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginTop: '2.2rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: 'var(--gold)',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        marginBottom: '0.75rem',
        paddingBottom: '0.4rem',
        borderBottom: '1px solid var(--border-dim)',
      }}>
        {title}
      </h2>
      <div style={{ color: 'var(--text-primary)', lineHeight: '1.75' }}>
        {children}
      </div>
    </section>
  );
}
