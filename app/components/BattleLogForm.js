'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function BattleLogForm({ campaign, territories, factions, userId, preselectedTerritoryId }) {
  const router = useRouter();
  const supabase = createClient();

  const [territoryId, setTerritoryId]       = useState(preselectedTerritoryId || '');
  const [attackerFactionId, setAttacker]     = useState('');
  const [defenderFactionId, setDefender]     = useState('');
  const [result, setResult]                  = useState(''); // 'attacker' | 'defender' | 'draw'
  const [attackerScore, setAttackerScore]    = useState('');
  const [defenderScore, setDefenderScore]    = useState('');
  const [narrative, setNarrative]            = useState('');
  const [transferControl, setTransferControl] = useState(false);
  const [submitting, setSubmitting]          = useState(false);
  const [error, setError]                    = useState('');

  const winnerFactionId =
    result === 'attacker' ? attackerFactionId :
    result === 'defender' ? defenderFactionId :
    null;

  const selectedTerritory = territories.find(t => t.id === territoryId);
  const currentController = selectedTerritory?.controlling_faction_id;
  const winnerIsDifferent  = winnerFactionId && winnerFactionId !== currentController;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!attackerFactionId || !defenderFactionId) {
      setError('Please select both factions.'); return;
    }
    if (attackerFactionId === defenderFactionId) {
      setError('Attacker and defender must be different factions.'); return;
    }
    if (!result) {
      setError('Please select a battle result.'); return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from('battles').insert({
      campaign_id:         campaign.id,
      territory_id:        territoryId || null,
      attacker_faction_id: attackerFactionId,
      defender_faction_id: defenderFactionId,
      winner_faction_id:   winnerFactionId,
      attacker_score:      attackerScore ? parseInt(attackerScore) : 0,
      defender_score:      defenderScore ? parseInt(defenderScore) : 0,
      narrative:           narrative.trim() || null,
      logged_by:           userId,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Optionally transfer territory control
    if (transferControl && territoryId && winnerFactionId) {
      await supabase
        .from('territories')
        .update({ controlling_faction_id: winnerFactionId })
        .eq('id', territoryId);
    }

    // Navigate back — to territory if one was selected, otherwise campaign dashboard
    if (territoryId) {
      router.push(`/c/${campaign.slug}/territory/${territoryId}`);
    } else {
      router.push(`/c/${campaign.slug}`);
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-2)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.65rem 0.9rem',
    fontSize: '0.95rem',
    outline: 'none',
    appearance: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontSize: '0.6rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--text-gold)',
    marginBottom: '0.5rem',
  };

  const resultBtnStyle = (active) => ({
    flex: 1,
    padding: '0.7rem 0.5rem',
    border: active ? '1px solid var(--gold)' : '1px solid var(--border-dim)',
    background: active ? 'rgba(183,140,64,0.12)' : 'var(--surface-2)',
    color: active ? 'var(--text-gold)' : 'var(--text-secondary)',
    fontFamily: 'var(--font-display)',
    fontSize: '0.6rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '640px' }}>

      {/* Territory */}
      <div style={{ marginBottom: '1.75rem' }}>
        <label style={labelStyle}>Theatre of Battle</label>
        <select value={territoryId} onChange={e => setTerritoryId(e.target.value)} style={inputStyle}>
          <option value="">— None / Unknown —</option>
          {territories.map(t => (
            <option key={t.id} value={t.id}>{t.name}{t.depth > 1 ? ' (sub-territory)' : ''}</option>
          ))}
        </select>
      </div>

      {/* Factions row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div>
          <label style={labelStyle}>Attacker</label>
          <select value={attackerFactionId} onChange={e => setAttacker(e.target.value)} style={inputStyle} required>
            <option value="">— Select faction —</option>
            {factions.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Defender</label>
          <select value={defenderFactionId} onChange={e => setDefender(e.target.value)} style={inputStyle} required>
            <option value="">— Select faction —</option>
            {factions.filter(f => f.id !== attackerFactionId).map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result */}
      <div style={{ marginBottom: '1.75rem' }}>
        <label style={labelStyle}>Battle Result</label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" style={resultBtnStyle(result === 'attacker')} onClick={() => setResult('attacker')}>
            Attacker Wins
          </button>
          <button type="button" style={resultBtnStyle(result === 'draw')} onClick={() => setResult('draw')}>
            Draw
          </button>
          <button type="button" style={resultBtnStyle(result === 'defender')} onClick={() => setResult('defender')}>
            Defender Wins
          </button>
        </div>
      </div>

      {/* Scores row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div>
          <label style={labelStyle}>Attacker Score <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
          <input
            type="number" min="0" value={attackerScore}
            onChange={e => setAttackerScore(e.target.value)}
            placeholder="e.g. 42" style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Defender Score <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
          <input
            type="number" min="0" value={defenderScore}
            onChange={e => setDefenderScore(e.target.value)}
            placeholder="e.g. 18" style={inputStyle}
          />
        </div>
      </div>

      {/* Transfer control checkbox — only if there's a winner and a territory */}
      {territoryId && result && result !== 'draw' && winnerIsDifferent && (
        <div style={{
          marginBottom: '1.75rem',
          padding: '1rem 1.25rem',
          border: '1px solid rgba(183,140,64,0.3)',
          background: 'rgba(183,140,64,0.05)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}>
          <input
            id="transfer"
            type="checkbox"
            checked={transferControl}
            onChange={e => setTransferControl(e.target.checked)}
            style={{ marginTop: '2px', accentColor: 'var(--gold)', flexShrink: 0 }}
          />
          <label htmlFor="transfer" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, cursor: 'pointer' }}>
            Transfer control of <strong style={{ color: 'var(--text-primary)' }}>{selectedTerritory?.name}</strong> to{' '}
            <strong style={{ color: 'var(--text-gold)' }}>
              {factions.find(f => f.id === winnerFactionId)?.name}
            </strong>
          </label>
        </div>
      )}

      {/* Narrative */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={labelStyle}>Battle Chronicle <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
        <textarea
          value={narrative}
          onChange={e => setNarrative(e.target.value)}
          rows={4}
          placeholder="Describe how the battle unfolded, heroic moments, or the fate of the territory…"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {error && (
        <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button type="submit" className="btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Recording…' : 'Record Battle'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
