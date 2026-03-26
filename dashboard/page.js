export default function DashboardPage() {
  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1rem' }}>
        Commander Overview
      </p>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Your campaigns, battle records, and faction status will appear here.</p>
    </div>
  );
}