'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const inputStyle = {
  width: '100%',
  background: 'var(--bg-deep)',
  border: '1px solid var(--border-dim)',
  color: 'var(--text-primary)',
  padding: '0.6rem 0.75rem',
  fontSize: '1rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

export default function AddToCampaignPanel({ battleId }) {
  const router  = useRouter();
  const panelRef = useRef(null);

  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(null); // null = not yet fetched
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [selectedCampaignId,  setSelectedCampaignId]  = useState('');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState('');
  const [attackerFactionId,   setAttackerFactionId]   = useState('');
  const [defenderFactionId,   setDefenderFactionId]   = useState('');
  const [submitting,          setSubmitting]          = useState(false);

  // Fetch options when panel first opens
  useEffect(() => {
    if (!open || options !== null) return;

    setLoading(true);
    fetch(`/api/battles/link-options?battleId=${battleId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setOptions([]); }
        else            { setOptions(data.campaigns ?? []); }
      })
      .catch(err => { setError(err.message); setOptions([]); })
      .finally(() => setLoading(false));
  }, [open, battleId, options]);

  // When campaign selection changes, reset downstream + pre-fill factions
  useEffect(() => {
    setSelectedTerritoryId('');

    if (!selectedCampaignId || !options) {
      setAttackerFactionId('');
      setDefenderFactionId('');
      return;
    }
    const camp = options.find(c => c.id === selectedCampaignId);
    if (!camp) return;

    setAttackerFactionId(camp.attackerFactionId ?? '');
    setDefenderFactionId(camp.defenderFactionId ?? '');
  }, [selectedCampaignId, options]);

  // Close panel on click-outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selectedCampaign = options?.find(c => c.id === selectedCampaignId) ?? null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedCampaignId || !attackerFactionId || !defenderFactionId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/battles/link-to-campaign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battleId,
          targetCampaignId:  selectedCampaignId,
          territoryId:       selectedTerritoryId || null,
          attackerFactionId,
          defenderFactionId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }

      setSuccess({ url: data.battleUrl, campaignName: selectedCampaign?.name ?? '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={panelRef}>
      <button
        className="btn-secondary"
        onClick={() => { setOpen(v => !v); setError(null); setSuccess(null); }}
        style={{ fontSize: '0.6rem' }}
      >
        ⊕ Record in Another Campaign
      </button>

      {open && (
        <div style={{
          position:        'absolute',
          top:             'calc(100% + 0.5rem)',
          left:            0,
          zIndex:          200,
          width:           'min(420px, 92vw)',
          background:      'var(--bg-raised)',
          border:          '1px solid var(--border-dim)',
          boxShadow:       '0 8px 32px rgba(0,0,0,0.5)',
          padding:         '1.5rem',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              margin: 0,
            }}>
              Record in Another Campaign
            </p>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              Checking your campaigns…
            </p>
          )}

          {/* No eligible campaigns */}
          {!loading && options !== null && options.length === 0 && !success && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
              No other campaigns found where both players are members. Ask both participants to join a second campaign first.
            </p>
          )}

          {/* Success state */}
          {success && (
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                ✓ Battle recorded in <strong>{success.campaignName}</strong>.
              </p>
              <a href={success.url}>
                <button className="btn-primary" style={{ fontSize: '0.6rem' }}>
                  View in {success.campaignName} →
                </button>
              </a>
            </div>
          )}

          {/* Form */}
          {!loading && options !== null && options.length > 0 && !success && (
            <form onSubmit={handleSubmit}>

              {/* Campaign selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Target Campaign
                </label>
                <select
                  required
                  value={selectedCampaignId}
                  onChange={e => setSelectedCampaignId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— Select a campaign —</option>
                  {options.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Territory selector */}
              {selectedCampaign && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Territory <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <select
                    value={selectedTerritoryId}
                    onChange={e => setSelectedTerritoryId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">— No territory —</option>
                    {selectedCampaign.territories.map(t => (
                      <option key={t.id} value={t.id}>
                        {'  '.repeat(Math.max(0, (t.depth ?? 0) - 1))}{t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Faction selectors */}
              {selectedCampaign && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      Attacker Faction
                    </label>
                    <select
                      required
                      value={attackerFactionId}
                      onChange={e => setAttackerFactionId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">— Select —</option>
                      {selectedCampaign.factions.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      Defender Faction
                    </label>
                    <select
                      required
                      value={defenderFactionId}
                      onChange={e => setDefenderFactionId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">— Select —</option>
                      {selectedCampaign.factions.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <p style={{ color: '#e05c5c', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>
              )}

              {/* Submit */}
              {selectedCampaign && (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || !attackerFactionId || !defenderFactionId}
                  style={{ width: '100%', fontSize: '0.6rem', opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting ? 'Recording…' : `Record in ${selectedCampaign.name}`}
                </button>
              )}
            </form>
          )}

          {/* Error outside form (e.g. fetch failure) */}
          {error && !success && !options?.length && (
            <p style={{ color: '#e05c5c', fontSize: '0.82rem', marginTop: '0.5rem' }}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
