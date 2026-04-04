'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SetFactionForm({ campaignId, currentFactionId, factions }) {
  const supabase = createClient();
  const [selected, setSelected] = useState(currentFactionId || '');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError('');

    const { data: savedRows, error: err } = await supabase
      .from('campaign_members')
      .update({ faction_id: selected || null })
      .eq('campaign_id', campaignId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .select();

    setSaving(false);
    if (err) {
      setError(err.message);
    } else if (!savedRows || savedRows.length === 0) {
      setError('Could not save — permission denied. Contact your campaign organiser.');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  const inputStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.6rem 0.9rem',
    fontSize: '0.9rem',
    outline: 'none',
    appearance: 'none',
    flex: 1,
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selected}
          onChange={e => { setSelected(e.target.value); setSaved(false); }}
          style={inputStyle}
        >
          <option value="">— No faction assigned —</option>
          {factions.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {saved && (
        <p style={{ color: 'var(--text-gold)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          ✓ Faction updated
        </p>
      )}
      {error && (
        <p style={{ color: '#e05a5a', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>
      )}
    </div>
  );
}
