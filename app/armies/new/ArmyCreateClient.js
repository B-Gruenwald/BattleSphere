'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ArmyCreateClient() {
  const router = useRouter();

  const [form, setForm] = useState({
    name:         '',
    game_system:  '',
    faction_name: '',
    tagline:      '',
  });
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState(null);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Army name is required.'); return; }

    setSaving(true);
    setError(null);

    try {
      const res  = await fetch('/api/armies', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create army');

      // Redirect to the edit page so the player can add backstory, cover image, and units
      router.push(`/armies/${data.army.id}/edit`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg-raised)',
    border: '1px solid var(--border-dim)', color: 'var(--text-primary)',
    padding: '0.65rem 0.85rem', fontSize: '1rem',
    outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-display)', fontSize: '0.58rem',
    letterSpacing: '0.14em', textTransform: 'uppercase',
    color: 'var(--text-gold)', marginBottom: '0.5rem',
  };

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '640px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Dashboard</Link>
        <span style={{ color: 'var(--border-dim)', fontSize: '0.8rem' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>New Army</span>
      </nav>

      <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        New Army
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
        Give your army a name to get started. You can add backstory, cover image, and units on the next screen.
      </p>

      {error && (
        <div style={{ background: 'rgba(224,90,90,0.08)', border: '1px solid rgba(224,90,90,0.3)', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#e05a5a', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>

          <div>
            <label style={labelStyle}>Army Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Iron Hands 4th Demi-Company"
              style={inputStyle}
              disabled={saving}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Game System</label>
              <input
                name="game_system"
                value={form.game_system}
                onChange={handleChange}
                placeholder="e.g. Warhammer 40K"
                style={inputStyle}
                disabled={saving}
              />
            </div>
            <div>
              <label style={labelStyle}>Faction</label>
              <input
                name="faction_name"
                value={form.faction_name}
                onChange={handleChange}
                placeholder="e.g. Space Marines"
                style={inputStyle}
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tagline</label>
            <input
              name="tagline"
              value={form.tagline}
              onChange={handleChange}
              placeholder="One punchy sentence about this army"
              style={inputStyle}
              disabled={saving}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Creating…' : 'Create Army →'}
          </button>
          <Link href="/dashboard">
            <button type="button" className="btn-secondary" disabled={saving}>Cancel</button>
          </Link>
        </div>
      </form>
    </div>
  );
}
