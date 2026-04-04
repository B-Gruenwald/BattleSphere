export const metadata = {
  title: 'Privacy Policy — BattleSphere',
  description: 'How BattleSphere collects, uses, and protects your personal data.',
};

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
      </header>

      {/* Intro */}
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
        This Privacy Policy explains how BattleSphere collects, uses, and protects your
        personal data. It applies to all users of the BattleSphere platform and any future
        domains under which the platform is operated.
      </p>

      {/* Table of Contents */}
      <nav style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius)',
        marginBottom: '2.5rem',
      }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--text-muted)',
          marginBottom: '0.75rem',
        }}>
          Contents
        </p>
        <ol style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: '1.9' }}>
          {[
            ['#controller', 'Data Controller'],
            ['#what-we-collect', 'What Data We Collect'],
            ['#cookies', 'Cookies & Session Data'],
            ['#legal-basis', 'Legal Basis for Processing'],
            ['#processors', 'Third-Party Service Providers'],
            ['#retention', 'Data Retention'],
            ['#your-rights', 'Your Rights'],
            ['#minors', 'Minors'],
            ['#security', 'Data Security'],
            ['#changes', 'Changes to This Policy'],
            ['#contact', 'Contact & Complaints'],
          ].map(([href, label], i) => (
            <li key={href}>
              <a href={href} className="toc-link">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* 1 */}
      <Section id="controller" number="1" title="Data Controller">
        <p>The data controller responsible for the processing of your personal data is:</p>
        <p style={{ marginTop: '0.75rem', lineHeight: '1.9' }}>
          Benjamin Gruenwald<br />
          Austria<br />
          Email:{' '}
          <a href="mailto:benjamin.gruenwald@outlook.com" style={{ color: 'var(--gold)' }}>
            benjamin.gruenwald@outlook.com
          </a>
        </p>
      </Section>

      {/* 2 */}
      <Section id="what-we-collect" number="2" title="What Data We Collect">
        <p>
          We collect only the data necessary to provide the BattleSphere service.
        </p>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '1rem',
          fontSize: '0.88rem',
        }}>
          <thead>
            <tr>
              {['Category', 'Data collected', 'When'].map(h => (
                <th key={h} style={{
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-elevated)',
                  color: 'var(--gold)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: '600',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Account data', 'Email address, display name / username', 'At registration'],
              ['Campaign & gameplay data', 'Campaign names and settings, faction names, player assignments, battle records, territory control history, event posts, achievement records, chronicle entries', 'During use of the platform'],
              ['Authentication data', 'Encrypted password hash (never stored in plaintext), session token stored in a browser cookie', 'At login / registration'],
              ['Technical data', 'IP address, browser type, operating system, timestamp of requests', 'Automatically, via server and hosting logs'],
            ].map(([cat, data, when], i) => (
              <tr key={cat}>
                <td style={{ padding: '0.55rem 0.75rem', border: '1px solid var(--border-dim)', background: i % 2 === 1 ? 'var(--bg-surface)' : 'transparent', fontWeight: '600', whiteSpace: 'nowrap' }}>{cat}</td>
                <td style={{ padding: '0.55rem 0.75rem', border: '1px solid var(--border-dim)', background: i % 2 === 1 ? 'var(--bg-surface)' : 'transparent' }}>{data}</td>
                <td style={{ padding: '0.55rem 0.75rem', border: '1px solid var(--border-dim)', background: i % 2 === 1 ? 'var(--bg-surface)' : 'transparent', whiteSpace: 'nowrap' }}>{when}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          We do not collect payment data, government identification numbers, health data,
          or any special categories of personal data as defined under Art. 9 GDPR.
        </p>
      </Section>

      {/* 3 */}
      <Section id="cookies" number="3" title="Cookies & Session Data">
        <p>
          BattleSphere uses cookies solely to operate the authentication system. When you
          log in, a session cookie is stored in your browser. This cookie contains an
          encrypted token that keeps you logged in during and between visits.
        </p>
        <p style={{ marginTop: '0.8rem' }}>
          These are <strong>strictly necessary cookies</strong>. Without them, the login
          system cannot function. They do not track your browsing behaviour across other
          websites and are not used for advertising or analytics.
        </p>
        <p style={{ marginTop: '0.8rem' }}>
          We do not currently use any analytics, tracking, or marketing cookies. Should
          this change in the future, this policy will be updated and users will be
          informed. You can delete cookies at any time via your browser settings; this
          will log you out of BattleSphere.
        </p>
      </Section>

      {/* 4 */}
      <Section id="legal-basis" number="4" title="Legal Basis for Processing">
        <p>We process your personal data on the following legal bases under the GDPR:</p>
        <ul style={{ marginTop: '0.75rem', paddingLeft: '1.4rem', lineHeight: '1.9' }}>
          <li>
            <strong>Performance of a contract (Art. 6(1)(b) GDPR):</strong> Processing
            your account data, campaign data, and authentication data is necessary to
            provide the BattleSphere service you have registered for.
          </li>
          <li style={{ marginTop: '0.5rem' }}>
            <strong>Legitimate interests (Art. 6(1)(f) GDPR):</strong> Technical log data
            is processed to maintain the security, stability, and integrity of the platform.
            Our legitimate interest is the prevention of abuse, fraud, and unauthorised
            access.
          </li>
        </ul>
      </Section>

      {/* 5 */}
      <Section id="processors" number="5" title="Third-Party Service Providers">
        <p>
          To operate BattleSphere, we rely on the following third-party data processors.
          These providers act on our instructions and are bound by data processing
          agreements (DPAs) in accordance with GDPR requirements.
        </p>
        <SubHeading>Supabase (database & authentication)</SubHeading>
        <p>
          Supabase, Inc. provides our database and user authentication infrastructure.
          Your account data, campaign data, and session tokens are stored on Supabase
          servers. We use the EU-based Supabase region to ensure data is stored within
          the European Economic Area. Supabase's privacy policy is available at{' '}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>
            supabase.com/privacy
          </a>.
        </p>
        <SubHeading>Vercel (hosting & content delivery)</SubHeading>
        <p>
          Vercel, Inc. hosts the BattleSphere web application and serves it to users.
          Vercel may process technical log data (including IP addresses) as part of
          delivering the service. Vercel is certified under the EU–US Data Privacy
          Framework and offers a GDPR-compliant Data Processing Addendum. Vercel's privacy
          policy is available at{' '}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>
            vercel.com/legal/privacy-policy
          </a>.
        </p>
        <p style={{ marginTop: '0.8rem' }}>
          We do not sell, rent, or share your personal data with any other third parties,
          nor do we use your data for advertising purposes.
        </p>
      </Section>

      {/* 6 */}
      <Section id="retention" number="6" title="Data Retention">
        <ul style={{ paddingLeft: '1.4rem', lineHeight: '1.9' }}>
          <li>
            <strong>Account and campaign data</strong> is retained for the lifetime of
            your account. If you request deletion of your account, your personal data
            will be permanently deleted within 30 days.
          </li>
          <li style={{ marginTop: '0.5rem' }}>
            <strong>Technical log data</strong> is retained for up to 90 days for
            security and troubleshooting purposes, after which it is automatically deleted
            or anonymised by our hosting provider.
          </li>
        </ul>
      </Section>

      {/* 7 */}
      <Section id="your-rights" number="7" title="Your Rights">
        <p>
          Under the GDPR, you have the following rights regarding your personal data:
        </p>
        <ul style={{ marginTop: '0.75rem', paddingLeft: '1.4rem', lineHeight: '1.9' }}>
          <li><strong>Right of access (Art. 15):</strong> Request a copy of the personal data we hold about you.</li>
          <li><strong>Right to rectification (Art. 16):</strong> Request that inaccurate data be corrected.</li>
          <li><strong>Right to erasure (Art. 17):</strong> Request that your personal data be deleted ("right to be forgotten").</li>
          <li><strong>Right to restriction (Art. 18):</strong> Request that we limit the processing of your data in certain circumstances.</li>
          <li><strong>Right to data portability (Art. 20):</strong> Request your data in a structured, machine-readable format.</li>
          <li><strong>Right to object (Art. 21):</strong> Object to processing based on legitimate interests.</li>
        </ul>
        <p style={{ marginTop: '0.8rem' }}>
          To exercise any of these rights, please contact us at{' '}
          <a href="mailto:benjamin.gruenwald@outlook.com" style={{ color: 'var(--gold)' }}>
            benjamin.gruenwald@outlook.com
          </a>. We will respond within 30 days. There is no charge for exercising your rights.
        </p>
      </Section>

      {/* 8 */}
      <Section id="minors" number="8" title="Minors">
        <p>
          BattleSphere is intended for users aged 16 and over. We do not knowingly collect
          personal data from children under the age of 16. If you are under 16, please do
          not register or submit any personal information. If we become aware that a user
          is under 16, we will delete their account and associated data promptly.
        </p>
        <p style={{ marginTop: '0.8rem' }}>
          Parents or guardians who believe their child has registered on BattleSphere
          should contact us at{' '}
          <a href="mailto:benjamin.gruenwald@outlook.com" style={{ color: 'var(--gold)' }}>
            benjamin.gruenwald@outlook.com
          </a>{' '}
          and we will act immediately.
        </p>
      </Section>

      {/* 9 */}
      <Section id="security" number="9" title="Data Security">
        <p>
          We take the security of your data seriously and implement appropriate technical
          measures to protect it, including:
        </p>
        <ul style={{ marginTop: '0.75rem', paddingLeft: '1.4rem', lineHeight: '1.9' }}>
          <li>Encrypted HTTPS connections for all data transmission</li>
          <li>Passwords stored exclusively as secure cryptographic hashes (never in plaintext)</li>
          <li>Row-level security policies in our database, ensuring users can only access their own and shared campaign data</li>
          <li>Session tokens transmitted only via secure, HTTP-only cookies</li>
        </ul>
        <p style={{ marginTop: '0.8rem' }}>
          In the event of a data breach likely to result in a risk to your rights and
          freedoms, we will notify the competent supervisory authority within 72 hours
          and inform affected users without undue delay.
        </p>
      </Section>

      {/* 10 */}
      <Section id="changes" number="10" title="Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect changes in the
          platform, applicable law, or our data practices. When we make material changes,
          we will notify registered users by email and update the "Last updated" date
          below. Continued use of BattleSphere after the effective date of any changes
          constitutes acceptance of the revised policy.
        </p>
      </Section>

      {/* 11 */}
      <Section id="contact" number="11" title="Contact & Complaints">
        <p>
          For any questions, requests, or concerns relating to this Privacy Policy or the
          handling of your personal data, please contact:
        </p>
        <p style={{ marginTop: '0.75rem', lineHeight: '1.9' }}>
          Benjamin Gruenwald<br />
          Email:{' '}
          <a href="mailto:benjamin.gruenwald@outlook.com" style={{ color: 'var(--gold)' }}>
            benjamin.gruenwald@outlook.com
          </a>
        </p>
        <p style={{ marginTop: '0.8rem' }}>
          If you are not satisfied with our response, you have the right to lodge a
          complaint with the Austrian data protection authority:
        </p>
        <p style={{ marginTop: '0.75rem', lineHeight: '1.9' }}>
          <strong>Datenschutzbehörde (DSB)</strong><br />
          Barichgasse 40–42, 1030 Vienna, Austria<br />
          <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>
            www.dsb.gv.at
          </a>
          {' · '}
          <a href="mailto:dsb@dsb.gv.at" style={{ color: 'var(--gold)' }}>
            dsb@dsb.gv.at
          </a>
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
        <a href="/impressum" style={{ color: 'var(--gold)' }}>Legal Notice →</a>
      </div>

    </div>
  );
}

function Section({ id, number, title, children }) {
  return (
    <section id={id} style={{ marginTop: '2.5rem', scrollMarginTop: '80px' }}>
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
        {number}. {title}
      </h2>
      <div style={{ color: 'var(--text-primary)', lineHeight: '1.75' }}>
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children }) {
  return (
    <h3 style={{
      fontFamily: 'var(--font-display)',
      fontSize: '0.7rem',
      fontWeight: '600',
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginTop: '1.2rem',
      marginBottom: '0.4rem',
    }}>
      {children}
    </h3>
  );
}
