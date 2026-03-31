'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const BATTLE_TYPES = [
  'Boarding Action',
  'Combat Patrol',
  'Incursion',
  'Strike Force',
  'Onslaught',
  'Apocalypse',
];

export default function StandaloneBattleForm({ userId, battle }) {
  const router  = useRouter();
  const supabase = createClient();
  const isEdit   = !!battle;

  const [battleType,        setBattleType]        = useState(battle?.battle_type         || '');
  const [attackerPlayer,    setAttackerPlayer]    = useState(battle?.attacker_player      || '');
  const [attackerFaction,   setAttackerFaction]   = useState(battle?.attacker_faction     || '');
  const [attackerArmyType,  setAttackerArmyType]  = useState(battle?.attacker_army_type   || '');
  const [attackerArmyList,  setAttackerArmyList]  = useState(battle?.attacker_army_list   || '');
  const [attackerScore,     setAttackerScore]     = useState(battle?.attacker_score       ?? '');
  const [attackerNarrative, setAttackerNarrative] = useState(battle?.attacker_narrative   || '');
  const [defenderPlayer,    setDefenderPlayer]    = useState(battle?.defender_player      || '');
  const [defenderFaction,   setDefenderFaction]   = useState(battle?.defender_faction     || '');
  const [defenderArmyType,  setDefenderArmyType]  = useState(battle?.defender_army_type   || '');
  const [defenderArmyList,  setDefenderArmyList]  = useState(battle?.defender_army_list   || '');
  const [defenderScore,     setDefenderScore]     = useState(battle?.defender_score       ?? '');
  const [defenderNarrative, setDefenderNarrative] = useState(battle?.defender_narrative   || '');
  const [result,            setResult]            = useState(battle?.result               || '');
  const [notes,             setNotes]             = useState(battle?.notes                || '');
  const [submitting,        setSubmitting]        = useState(false);
  const [error,             setError]             = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!attackerFaction.trim() && !defenderFaction.trim()) {
      setError('Please fill in at least one faction name.'); return;
    }
    if (!result) {
      setError('Please select a battle result.'); return;
    }

    setSubmitting(true);

    const payload = {
      battle_type:          battleType           || null,
      attacker_player:      attackerPlayer.trim()  || null,
      attacker_faction:     attackerFaction.trim()  || null,
      attacker_army_type:   attackerArmyType.trim() || null,
      attacker_army_list:   attackerArmyList.trim() || null,
      attacker_score:       attackerScore !== '' ? parseInt(attackerScore) : 0,
      attacker_narrative:   attackerNarrative.trim() || null,
      defender_player:      defenderPlayer.trim()  || null,
      defender_faction:     defenderFaction.trim()  || null,
      defender_army_type:   defenderArmyType.trim() || null,
      defender_army_list:   defenderArmyList.trim() || null,
      defender_score:       defenderScore !== '' ? parseInt(defenderScore) : 0,
      defender_narrative:   defenderNarrative.trim() || null,
      result,
      notes:                notes.trim() || null,
    };

    let id = battle?.id;

    if (isEdit) {
      const { error: updateError } = await supabase
        .from('standalone_battles')
        .update(payload)
        .eq('id', battle.id);
      if (updateError) { setError(updateError.message); setSubmitting(false); return; }
    } else {
      const { data, error: insertError } = await supabase
        .from('standalone_battles')
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      if (insertError) { setError(insertError.message); setSubmitting(false); return; }
      id = data.id;
    }

    router.push(`/battle/${id}`);
    if (isEdit) router.refresh();
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)', padding: '0.65rem 0.9rem', fontSize: '0.95rem',
    outline: 'none', appearance: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.6rem',
    letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem',
  };
  const dimLabelStyle = { ...labelStyle, color: 'var(--text-secondary)' };
  const sublabelStyle = {
    display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontStyle: 'italic',
  };
  const resultBtnStyle = (active) => ({
    flex: 1, padding: '0.7rem 0.5rem',
    border: active ? '1px solid var(--gold)' : '1px solid var(--border-dim)',
    background: active ? 'rgba(183,140,64,0.12)' : 'var(--surface-2)',
    color: active ? 'var(--text-gold)' : 'var(--text-secondary)',
    fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em',
    textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
  });
  const sectionStyle = { marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-dim)' };
  const hintStyle    = { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontStyle: 'italic' };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '700px' }}>

      {/* ── Battle Type ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Battle Type</label>
        <select value={battleType} onChange={e => setBattleType(e.target.value)} style={{ ...inputStyle, maxWidth: '320px' }}>
          <option value="">— Select type —</option>
          {BATTLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* ── Players & Armies ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* Attacker column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <p style={{ ...labelStyle, marginBottom: 0 }}>Attacker</p>
            <div>
              <label style={dimLabelStyle}>Player Name <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <input type="text" value={attackerPlayer} onChange={e => setAttackerPlayer(e.target.value)}
                placeholder="e.g. MissionEternal" style={inputStyle} />
            </div>
            <div>
              <label style={dimLabelStyle}>Faction / Army <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <input type="text" value={attackerFaction} onChange={e => setAttackerFaction(e.target.value)}
                placeholder="e.g. Space Marines" style={inputStyle} />
            </div>
            <div>
              <label style={dimLabelStyle}>Army Type &amp; Detachment <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <input type="text" value={attackerArmyType} onChange={e => setAttackerArmyType(e.target.value)}
                placeholder="e.g. Gladius Task Force" style={inputStyle} />
            </div>
            <div>
              <label style={dimLabelStyle}>Army List <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <textarea value={attackerArmyList} onChange={e => setAttackerArmyList(e.target.value)}
                rows={5} placeholder="Paste or type army list…"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace', fontSize: '0.82rem' }} />
            </div>
          </div>

          {/* Defender column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <p style={{ ...labelStyle, marginBottom: 0 }}>Defender</p>
            <div>
              <label style={dimLabelStyle}>Player Name <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <input type="text" value={defenderPlayer} onChange={e => setDefenderPlayer(e.target.value)}
                placeholder="e.g. Opponent" style={inputStyle} />
            </div>
            <div>
              <label style={dimLabelStyle}>Faction / Army <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <input type="text" value={defenderFaction} onChange={e => setDefenderFaction(e.target.value)}
                placeholder="e.g. Aeldari" style={inputStyle} />
            </div>
            <div>
              <label style={dimLabelStyle}>Army Type &amp; Detachment <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <input type="text" value={defenderArmyType} onChange={e => setDefenderArmyType(e.target.value)}
                placeholder="e.g. Aspect Host" style={inputStyle} />
            </div>
            <div>
              <label style={dimLabelStyle}>Army List <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <textarea value={defenderArmyList} onChange={e => setDefenderArmyList(e.target.value)}
                rows={5} placeholder="Paste or type army list…"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace', fontSize: '0.82rem' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Result ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Battle Result</label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" style={resultBtnStyle(result === 'attacker')} onClick={() => setResult('attacker')}>Attacker Wins</button>
          <button type="button" style={resultBtnStyle(result === 'draw')}     onClick={() => setResult('draw')}>Draw</button>
          <button type="button" style={resultBtnStyle(result === 'defender')} onClick={() => setResult('defender')}>Defender Wins</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>
          <div>
            <label style={dimLabelStyle}>Attacker Score <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
            <input type="number" min="0" value={attackerScore} onChange={e => setAttackerScore(e.target.value)}
              placeholder="e.g. 42" style={inputStyle} />
          </div>
          <div>
            <label style={dimLabelStyle}>Defender Score <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
            <input type="number" min="0" value={defenderScore} onChange={e => setDefenderScore(e.target.value)}
              placeholder="e.g. 18" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ── Battle Chronicles ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Battle Chronicles <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <span style={{ ...sublabelStyle, marginBottom: '0.5rem' }}>Attacker's Account</span>
            <textarea value={attackerNarrative} onChange={e => setAttackerNarrative(e.target.value)}
              rows={4} placeholder="Describe the battle from the attacker's perspective…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
            <p style={hintStyle}>**bold** &nbsp;·&nbsp; *italic*</p>
          </div>
          <div>
            <span style={{ ...sublabelStyle, marginBottom: '0.5rem' }}>Defender's Account</span>
            <textarea value={defenderNarrative} onChange={e => setDefenderNarrative(e.target.value)}
              rows={4} placeholder="Describe the battle from the defender's perspective…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
            <p style={hintStyle}>**bold** &nbsp;·&nbsp; *italic*</p>
          </div>
        </div>
      </div>

      {/* ── General Notes ── */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={dimLabelStyle}>General Notes <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={3} placeholder="Any other notes about this battle…"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
      </div>

      {error && <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button type="submit" className="btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
          {submitting ? (isEdit ? 'Saving…' : 'Recording…') : (isEdit ? 'Save Changes' : 'Record Battle')}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
