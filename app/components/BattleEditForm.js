'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function BattleEditForm({ battle, campaign, territories, factions, members }) {
  const router = useRouter();
  const supabase = createClient();

  const initialResult =
    !battle.winner_faction_id ? 'draw' :
    battle.winner_faction_id === battle.attacker_faction_id ? 'attacker' : 'defender';

  const [battleType,         setBattleType]        = useState(battle.battle_type          || '');
  const [scenario,           setScenario]          = useState(battle.scenario             || '');
  const [territoryId,        setTerritoryId]        = useState(battle.territory_id         || '');
  const [attackerPlayerId,   setAttackerPlayer]     = useState(battle.attacker_player_id   || '');
  const [defenderPlayerId,   setDefenderPlayer]     = useState(battle.defender_player_id   || '');
  const [attackerFactionId,  setAttacker]           = useState(battle.attacker_faction_id  || '');
  const [defenderFactionId,  setDefender]           = useState(battle.defender_faction_id  || '');
  const [attackerArmyType,   setAttackerArmyType]   = useState(battle.attacker_army_type   || '');
  const [defenderArmyType,   setDefenderArmyType]   = useState(battle.defender_army_type   || '');
  const [attackerArmyList,   setAttackerArmyList]   = useState(battle.attacker_army_list   || '');
  const [defenderArmyList,   setDefenderArmyList]   = useState(battle.defender_army_list   || '');
  const [result,             setResult]             = useState(initialResult);
  const [attackerScore,      setAttackerScore]      = useState(battle.attacker_score       ?? '');
  const [defenderScore,      setDefenderScore]      = useState(battle.defender_score       ?? '');
  const [attackerNarrative,  setAttackerNarrative]  = useState(battle.attacker_narrative   || '');
  const [defenderNarrative,  setDefenderNarrative]  = useState(battle.defender_narrative   || '');
  const [submitting,         setSubmitting]         = useState(false);
  const [error,              setError]              = useState('');

  // These refs prevent the auto-fill useEffects from overwriting the saved
  // faction IDs on initial mount. Without them, if a player's current
  // faction differs from what was recorded in the battle, the form would
  // silently overwrite the correct data before the user touches anything.
  const attackerEffectRan = useRef(false);
  const defenderEffectRan = useRef(false);

  useEffect(() => {
    if (!attackerEffectRan.current) { attackerEffectRan.current = true; return; }
    if (attackerPlayerId) {
      const member = members.find(m => m.user_id === attackerPlayerId);
      if (member?.faction_id) setAttacker(member.faction_id);
    }
  }, [attackerPlayerId]);

  useEffect(() => {
    if (!defenderEffectRan.current) { defenderEffectRan.current = true; return; }
    if (defenderPlayerId) {
      const member = members.find(m => m.user_id === defenderPlayerId);
      if (member?.faction_id) setDefender(member.faction_id);
    }
  }, [defenderPlayerId]);

  const winnerFactionId =
    result === 'attacker' ? attackerFactionId :
    result === 'defender' ? defenderFactionId : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // ── Validation ─────────────────────────────────────────────────────────────
    if (!attackerFactionId) {
      if (attackerPlayerId) {
        const attackerMember = members.find(m => m.user_id === attackerPlayerId);
        if (attackerMember && !attackerMember.faction_id) {
          setError('The attacker has no faction assigned. They can set one from their Player Profile, or select one manually in the Faction field above.');
        } else {
          setError('Please select a faction for the attacker.');
        }
      } else {
        setError('Please select a faction for the attacker.');
      }
      return;
    }

    if (!defenderFactionId) {
      if (defenderPlayerId) {
        const defenderMember = members.find(m => m.user_id === defenderPlayerId);
        if (defenderMember && !defenderMember.faction_id) {
          setError('The defender has no faction assigned. They can set one from their Player Profile, or select one manually in the Faction field above.');
        } else {
          setError('Please select a faction for the defender.');
        }
      } else {
        setError('Please select a faction for the defender.');
      }
      return;
    }

    if (attackerFactionId === defenderFactionId) {
      setError('Attacker and defender must be different factions.');
      return;
    }

    if (!result) {
      setError('Please select a battle result.');
      return;
    }

    setSubmitting(true);

    // Use .select() so we can detect when RLS silently blocks the update
    // (Supabase returns 0 rows with no error when RLS prevents an update)
    const { data: saved, error: updateError } = await supabase
      .from('battles')
      .update({
        battle_type:           battleType          || null,
        scenario:              scenario.trim()     || null,
        territory_id:          territoryId         || null,
        attacker_faction_id:   attackerFactionId,
        defender_faction_id:   defenderFactionId,
        winner_faction_id:     winnerFactionId,
        attacker_player_id:    attackerPlayerId    || null,
        defender_player_id:    defenderPlayerId    || null,
        attacker_army_type:    attackerArmyType.trim()  || null,
        defender_army_type:    defenderArmyType.trim()  || null,
        attacker_army_list:    attackerArmyList.trim()  || null,
        defender_army_list:    defenderArmyList.trim()  || null,
        attacker_score:        attackerScore !== '' ? parseInt(attackerScore) : 0,
        defender_score:        defenderScore !== '' ? parseInt(defenderScore) : 0,
        attacker_narrative:    attackerNarrative.trim() || null,
        defender_narrative:    defenderNarrative.trim() || null,
      })
      .eq('id', battle.id)
      .select();

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    if (!saved || saved.length === 0) {
      setError(
        'Changes could not be saved — only the attacker, defender, the player who logged the battle, ' +
        'or the campaign organiser can edit this record.'
      );
      setSubmitting(false);
      return;
    }

    router.push(`/c/${campaign.slug}/battle/${battle.id}`);
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
  const hintStyle = { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontStyle: 'italic' };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '700px' }}>

      {/* ── Battle Type + Scenario + Theatre ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Battle Type</label>
            <select value={battleType} onChange={e => setBattleType(e.target.value)} style={inputStyle}>
              <option value="">— Select type —</option>
              {BATTLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>
              Scenario <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span>
            </label>
            <input
              type="text" value={scenario} onChange={e => setScenario(e.target.value)}
              placeholder="e.g. Vital Ground, Take &amp; Hold…" style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Theatre of Battle</label>
          <select value={territoryId} onChange={e => setTerritoryId(e.target.value)} style={inputStyle}>
            <option value="">— None / Unknown —</option>
            {territories.map(t => (
              <option key={t.id} value={t.id}>
                {'  '.repeat(t.depth - 1)}{t.name}{t.depth > 1 ? ` (${t.type || 'sub-territory'})` : ''}
              </option>
            ))}
          </select>
          {territoryId && result && (
            <p style={hintStyle}>
              {result === 'draw'
                ? '⬡ Both factions will gain influence here when this battle was first logged.'
                : `⬡ ${result === 'attacker' ? factions.find(f => f.id === attackerFactionId)?.name || 'Winner' : factions.find(f => f.id === defenderFactionId)?.name || 'Winner'} gained +3 influence here when this battle was first logged.`
              }
            </p>
          )}
        </div>
      </div>

      {/* ── Players & Armies ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* Attacker column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Attacker Player</label>
              <select value={attackerPlayerId} onChange={e => setAttackerPlayer(e.target.value)} style={inputStyle}>
                <option value="">— Select player —</option>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
              </select>
            </div>
            <div>
              <span style={sublabelStyle}>
                {attackerPlayerId && members.find(m => m.user_id === attackerPlayerId)?.faction_id
                  ? 'Faction (auto-filled, overridable)' : 'Faction'}
              </span>
              <select value={attackerFactionId} onChange={e => setAttacker(e.target.value)} style={inputStyle} required>
                <option value="">— Select faction —</option>
                {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>
                Army Type &amp; Detachment <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span>
              </label>
              <input
                type="text" value={attackerArmyType} onChange={e => setAttackerArmyType(e.target.value)}
                placeholder="e.g. Space Marines – Gladius Task Force" style={inputStyle}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>
                Army List <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span>
              </label>
              <textarea
                value={attackerArmyList} onChange={e => setAttackerArmyList(e.target.value)}
                rows={5} placeholder="Paste or type army list here…"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Defender column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Defender Player <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <select value={defenderPlayerId} onChange={e => setDefenderPlayer(e.target.value)} style={inputStyle}>
                <option value="">— Select player —</option>
                {members.filter(m => m.user_id !== attackerPlayerId).map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.username}</option>
                ))}
              </select>
            </div>
            <div>
              <span style={sublabelStyle}>
                {defenderPlayerId && members.find(m => m.user_id === defenderPlayerId)?.faction_id
                  ? 'Faction (auto-filled, overridable)' : 'Faction'}
              </span>
              <select value={defenderFactionId} onChange={e => setDefender(e.target.value)} style={inputStyle} required>
                <option value="">— Select faction —</option>
                {factions.filter(f => f.id !== attackerFactionId).map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>
                Army Type &amp; Detachment <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span>
              </label>
              <input
                type="text" value={defenderArmyType} onChange={e => setDefenderArmyType(e.target.value)}
                placeholder="e.g. Aeldari – Aspect Host" style={inputStyle}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>
                Army List <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span>
              </label>
              <textarea
                value={defenderArmyList} onChange={e => setDefenderArmyList(e.target.value)}
                rows={5} placeholder="Paste or type army list here…"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace', fontSize: '0.82rem' }}
              />
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
            <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>Attacker Score <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
            <input type="number" min="0" value={attackerScore} onChange={e => setAttackerScore(e.target.value)} placeholder="e.g. 42" style={inputStyle} />
          </div>
          <div>
            <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>Defender Score <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
            <input type="number" min="0" value={defenderScore} onChange={e => setDefenderScore(e.target.value)} placeholder="e.g. 18" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ── Battle Chronicles ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Battle Chronicles <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <span style={{ ...sublabelStyle, marginBottom: '0.5rem' }}>Attacker's Account</span>
            <textarea
              value={attackerNarrative} onChange={e => setAttackerNarrative(e.target.value)}
              rows={5} placeholder="Describe the battle from the attacker's perspective…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            <p style={hintStyle}>**bold** &nbsp;·&nbsp; *italic*</p>
          </div>
          <div>
            <span style={{ ...sublabelStyle, marginBottom: '0.5rem' }}>Defender's Account</span>
            <textarea
              value={defenderNarrative} onChange={e => setDefenderNarrative(e.target.value)}
              rows={5} placeholder="Describe the battle from the defender's perspective…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            <p style={hintStyle}>**bold** &nbsp;·&nbsp; *italic*</p>
          </div>
        </div>
      </div>

      {error && <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button type="submit" className="btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
