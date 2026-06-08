'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BATTLE_TYPES = [
  'Combat Patrol', 'Incursion', 'Strike Force', 'Onslaught', 'Apocalypse',
  'Boarding Action', 'Kill Team', 'Crusade',
];

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--text-gold)',
  fontWeight: '700',
  marginBottom: '0.5rem',
};

const inputStyle = {
  width: '100%',
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-dim)',
  color: 'var(--text-primary)',
  padding: '0.65rem 0.9rem',
  fontSize: '1rem',
  outline: 'none',
  appearance: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const optToggleStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-gold)',
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  padding: '0.5rem 0',
  fontWeight: 'normal',
};

const sectionStyle = {
  marginBottom: '2rem',
  paddingBottom: '2rem',
  borderBottom: '1px solid var(--border-dim)',
};

const resultBtnStyle = (active, colour) => ({
  flex: 1,
  padding: '0.75rem 0.5rem',
  border: active ? `1px solid ${colour}` : '1px solid var(--border-dim)',
  background: active ? `${colour}18` : 'var(--bg-raised)',
  color: active ? colour : 'var(--text-secondary)',
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'all 0.15s',
});

export default function FreeBattleLogForm({ user, myArmies, allProfiles }) {
  const router = useRouter();

  // Result (required)
  const [result, setResult] = useState(''); // 'p1' | 'draw' | 'p2'

  // Key facts
  const [battleType, setBattleType] = useState('');
  const [headline,   setHeadline]   = useState('');

  // Player 1 (you)
  const [p1ArmyId,   setP1ArmyId]   = useState('');
  const [p1Score,    setP1Score]     = useState('');
  const [p1ArmyType, setP1ArmyType] = useState('');

  // Player 2 (opponent)
  const [p2PlayerId,  setP2PlayerId]  = useState('');
  const [p2ArmyType,  setP2ArmyType]  = useState('');
  const [p2Score,     setP2Score]     = useState('');

  // Optional sections
  const [showDetails,   setShowDetails]   = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);

  const [p1Narrative, setP1Narrative] = useState('');
  const [p2Narrative, setP2Narrative] = useState('');
  const [notes,       setNotes]       = useState('');
  const [scenario,    setScenario]    = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const p1Name = user.username ?? 'You';
  const p2Profile = allProfiles.find(p => p.id === p2PlayerId);
  const p2Name = p2Profile?.username ?? 'Opponent';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!result) { setError('Please select a battle result.'); return; }

    setSubmitting(true);
    setError('');

    const winnerPlayerId =
      result === 'p1'   ? user.id     :
      result === 'p2'   ? p2PlayerId  :
      null;

    const payload = {
      headline:           headline.trim()  || null,
      battle_type:        battleType       || null,
      scenario:           scenario.trim()  || null,
      attacker_player_id: user.id,
      defender_player_id: p2PlayerId       || null,
      winner_player_id:   winnerPlayerId,
      attacker_score:     p1Score !== '' ? parseInt(p1Score) : 0,
      defender_score:     p2Score !== '' ? parseInt(p2Score) : 0,
      attacker_army_type: p1ArmyType.trim() || null,
      defender_army_type: p2ArmyType.trim() || null,
      attacker_narrative: p1Narrative.trim() || null,
      defender_narrative: p2Narrative.trim() || null,
      notes:              notes.trim()    || null,
      army_id_p1:         p1ArmyId        || null,
    };

    const res  = await fetch('/api/battles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) { setError(json.error || 'Failed to save battle.'); setSubmitting(false); return; }
    router.push(`/battles/${json.battle.id}`);
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '700px' }}>

      {/* ── Result (required) ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Result</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" style={resultBtnStyle(result === 'p1',   '#6abf6a')} onClick={() => setResult('p1')}>
            {p1Name} wins
          </button>
          <button type="button" style={resultBtnStyle(result === 'draw', 'var(--text-muted)')} onClick={() => setResult('draw')}>
            Draw
          </button>
          <button type="button" style={resultBtnStyle(result === 'p2',   '#e05a5a')} onClick={() => setResult('p2')}>
            {p2Name} wins
          </button>
        </div>
      </div>

      {/* ── Key Facts ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Battle Type</label>
            <select value={battleType} onChange={e => setBattleType(e.target.value)} style={inputStyle}>
              <option value="">— Select —</option>
              {BATTLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Headline <span style={{ fontWeight: 'normal', color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input
              type="text"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="e.g. Clash at Hive Secundus"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ── Players ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* P1 — You */}
          <div>
            <div style={{ ...labelStyle, marginBottom: '0.75rem' }}>{p1Name}</div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-muted)' }}>Army</label>
              <select value={p1ArmyId} onChange={e => setP1ArmyId(e.target.value)} style={inputStyle}>
                <option value="">— Select army —</option>
                {myArmies.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.game_system ? ` · ${a.game_system}` : ''}{a.faction_name ? ` · ${a.faction_name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-muted)' }}>Score</label>
              <input
                type="number" min="0" max="999"
                value={p1Score} onChange={e => setP1Score(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* P2 — Opponent */}
          <div>
            <div style={{ ...labelStyle, marginBottom: '0.75rem' }}>Opponent</div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-muted)' }}>Player</label>
              <select value={p2PlayerId} onChange={e => setP2PlayerId(e.target.value)} style={inputStyle}>
                <option value="">— Select player —</option>
                {allProfiles.filter(p => p.id !== user.id).map(p => (
                  <option key={p.id} value={p.id}>{p.username}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-muted)' }}>Army / Faction</label>
              <input
                type="text"
                value={p2ArmyType} onChange={e => setP2ArmyType(e.target.value)}
                placeholder="e.g. Space Marines"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-muted)' }}>Score</label>
              <input
                type="number" min="0" max="999"
                value={p2Score} onChange={e => setP2Score(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Optional: Scenario & Notes ── */}
      <div style={sectionStyle}>
        <button type="button" style={optToggleStyle} onClick={() => setShowDetails(v => !v)}>
          {showDetails ? '▾ Hide details' : '▸ Add scenario / notes'}
        </button>
        {showDetails && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Scenario</label>
              <input type="text" value={scenario} onChange={e => setScenario(e.target.value)} style={inputStyle} placeholder="e.g. Vital Ground" />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Optional: Narratives ── */}
      <div style={sectionStyle}>
        <button type="button" style={optToggleStyle} onClick={() => setShowNarrative(v => !v)}>
          {showNarrative ? '▾ Hide narrative' : '▸ Add narrative'}
        </button>
        {showNarrative && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>{p1Name}'s Account</label>
              <textarea value={p1Narrative} onChange={e => setP1Narrative(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>{p2Name}'s Account</label>
              <textarea value={p2Narrative} onChange={e => setP2Narrative(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: '#e05a5a', fontSize: '0.88rem', marginBottom: '1.25rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Recording…' : 'Record Battle'}
        </button>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
