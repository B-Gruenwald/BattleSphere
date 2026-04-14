'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function InfluenceOverrideForm({ campaignId, territoryId, factions, influence }) {
  const supabase = createClient();
  const router = useRouter();
  const [editing, setEditing] = useState(null); // faction id currently being edited
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const getPoints = (factionId) =>
    influence?.find(i => i.faction_id === factionId)?.influence_points ?? 0;

  const totalInfluence = factions.reduce((sum, f) => sum + getPoints(f.id), 0);

  async function handleSave(factionId) {
    setSaving(true);
    const pts = Math.max(0, parseInt(value) || 0);
    await supabase
      .from('territory_influence')
      .upsert({
        campaign_id:      campaignId,
        territory_id:     territoryId,
        faction_id:       factionId,
        influence_points: pts,
      }, { onConflict: 'territory_id,faction_id' });
    setSaving(false);
    setEditing(null);
    router.refresh();
  }

  const inputStyle = {
    width: '70px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.3rem 0.5rem',
    fontSize: '1rem',
    outline: 'none',
  };
  const smallBtnStyle = (gold) => ({
    background: gold ? 'rgba(183,140,64,0.12)' : 'none',
    border: `1px solid ${gold ? 'rgba(183,140,64,0.4)' : 'var(--border-dim)'}`,
    color: gold ? 'var(--text-gold)' : 'var(--text-muted)',
    padding: '0.25rem 0.65rem',
    fontSize: '0.7rem',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {factions.map(f => {
        const pts = getPoints(f.id);
        const pct = totalInfluence > 0 ? (pts / totalInfluence) * 100 : 0;
        const isEditing = editing === f.id;

        return (
          <div key={f.id}>
            {/* Faction name + score + edit button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <div style={{ width: '8px', height: '8px', background: f.colour, transform: 'rotate(45deg)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{f.name}</span>
              {!isEditing && (
                <>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem', color: 'var(--text-gold)', minWidth: '28px', textAlign: 'right' }}>
                    {pts}
                  </span>
                  <button onClick={() => { setEditing(f.id); setValue(String(pts)); }} style={smallBtnStyle(false)}>
                    Edit
                  </button>
                </>
              )}
            </div>

            {/* Influence bar */}
            {!isEditing && (
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: f.colour,
                  transition: 'width 0.4s ease',
                  minWidth: pts > 0 ? '2px' : '0',
                }} />
              </div>
            )}

            {/* Inline edit controls */}
            {isEditing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="number" min="0" value={value}
                  onChange={e => setValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(f.id); if (e.key === 'Escape') setEditing(null); }}
                  autoFocus
                  style={inputStyle}
                />
                <button onClick={() => handleSave(f.id)} disabled={saving} style={smallBtnStyle(true)}>
                  {saving ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditing(null)} style={smallBtnStyle(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        );
      })}

      {totalInfluence === 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>
          No influence recorded yet. Battle here or set values manually above.
        </p>
      )}
    </div>
  );
}
