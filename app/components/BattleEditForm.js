'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { reverseInfluence } from '@/app/lib/influence';

const BATTLE_TYPES = [
  'KillTeam / Gang War',
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

  const [headline,         setHeadline]          = useState(battle.headline            || '');
  const [battleType,       setBattleType]         = useState(battle.battle_type         || '');
  const [scenario,         setScenario]           = useState(battle.scenario            || '');
  const [territoryId,      setTerritoryId]        = useState(battle.territory_id        || '');
  const [attackerPlayerId, setAttackerPlayer]     = useState(battle.attacker_player_id  || '');
  const [defenderPlayerId, setDefenderPlayer]     = useState(battle.defender_player_id  || '');
  const [attackerFactionId,setAttacker]           = useState(battle.attacker_faction_id || '');
  const [defenderFactionId,setDefender]           = useState(battle.defender_faction_id || '');
  const [attackerArmyType, setAttackerArmyType]   = useState(battle.attacker_army_type  || '');
  const [defenderArmyType, setDefenderArmyType]   = useState(battle.defender_army_type  || '');
  const [attackerArmyList, setAttackerArmyList]   = useState(battle.attacker_army_list  || '');
  const [defenderArmyList, setDefenderArmyList]   = useState(battle.defender_army_list  || '');
  const [result,           setResult]             = useState(initialResult);
  const [attackerScore,    setAttackerScore]      = useState(battle.attacker_score      ?? '');
  const [defenderScore,    setDefenderScore]      = useState(battle.defender_score      ?? '');
  const [attackerNarrative,setAttackerNarrative]  = useState(battle.attacker_narrative  || '');
  const [defenderNarrative,setDefenderNarrative]  = useState(battle.defender_narrative  || '');
  const [submitting,       setSubmitting]         = useState(false);
  const [error,            setError]              = useState('');
  const [confirmDelete,    setConfirmDelete]      = useState(false);
  const [deleting,         setDeleting]           = useState(false);

  // These refs prevent the auto-fill useEffects from overwriting the saved
  // faction IDs on initial mount.
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

    // ── Validation ──────────────────────────────────────────────────────────────
    if (!attackerFactionId) {
      if (attackerPlayerId) {
        const attackerMember = members.find(m => m.user_id === attackerPlayerId);
        if (attackerMember && !attackerMember.faction_id) {
          setError('The Registering Player has no faction assigned. They can set one from their Player Profile, or select one manually in the Faction field above.');
        } else {
          setError('Please select a faction for the Registering Player.');
        }
      } else {
        setError('Please select a faction for the Registering Player.');
      }
      return;
    }

    if (!defenderFactionId) {
      if (defenderPlayerId) {
        const defenderMember = members.find(m => m.user_id === defenderPlayerId);
        if (defenderMember && !defenderMember.faction_id) {
          setError('The Opponent has no faction assigned. They can set one from their Player Profile, or select one manually in the Faction field above.');
        } else {
          setError('Please select a faction for the Opponent.');
        }
      } else {
        setError('Please select a faction for the Opponent.');
      }
      return;
    }

    if (attackerFactionId === defenderFactionId) {
      setError('Registering Player and Opponent must be different factions.');
      return;
    }

    if (!result) {
      setError('Please select a battle result.');
      return;
    }

    setSubmitting(true);

    const { data: saved, error: updateError } = await supabase
      .from('battles')
      .update({
        headline:              headline.trim()          || null,
        battle_type:           battleType               || null,
        scenario:              scenario.trim()          || null,
        territory_id:          territoryId              || null,
        attacker_faction_id:   attackerFactionId,
        defender_faction_id:   defenderFactionId,
        winner_faction_id:     winnerFactionId,
        attacker_player_id:    attackerPlayerId         || null,
        defender_player_id:    defenderPlayerId         || null,
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
        'Changes could not be saved — only the Registering Player, Opponent, the player who logged the battle, ' +
        'or the campaign organiser can edit this record.'
      );
      setSubmitting(false);
      return;
    }

    router.push(`/c/${campaign.slug}/battle/${battle.id}`);
  }

  async function handleDelete() {
    setDeleting(true);
    setError('');

    await reverseInfluence(supabase, battle);

    const { error: deleteError } = await supabase
      .from('battles')
      .delete()
      .eq('id', battle.id);

    if (deleteError) {
      setError('Could not delete battle: ' + deleteError.message);
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }

    router.push(`/c/${campaign.slug}/battles`);
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
  const dangerBtnStyle = {
    padding: '0.65rem 1.25rem', background: 'transparent',
    border: '1px solid #7a2020', color: '#e05a5a',
    fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em',
    textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
  };
  const dangerBtnConfirmStyle = {
    ...dangerBtnStyle,
    background: 'rgba(224,90,90,0.12)', border: '1px solid #e05a5a',
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '700px' }}>

      {/* ── Headline ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Battle Headline <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span>
        </label>
        <input
          type="text"
          value={headline}
          onChange={e => setHeadline(e.target.value)}
          placeholder="e.g. The Fall of Hive Secondus, Ambush at the Iron Gate…"
          style={inputStyle}
        />
        <p style={hintStyle}>A short title for this battle — shown in battle lists and the chronicle.</p>
      </div>

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
                : `⬡ ${result === 'attacker' ? factions.find(f => f.id === attackerFactionId)?.name || 'Registering Player' : factions.find(f => f.id === defenderFactionId)?.name || 'Opponent'} gained +3 influence here when this battle was first logged.`
              }
            </p>
          )}
        </div>
      </div>

      {/* ── Players & Armies ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* Registering Player column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Registering Player</label>
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

          {/* Opponent column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Opponent <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
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
          <button type="button" style={resultBtnStyle(result === 'attacker')} onClick={() => setResult('attacker')}>Registering Player Wins</button>
          <button type="button" style={resultBtnStyle(result === 'draw')}     onClick={() => setResult('draw')}>Draw</button>
          <button type="button" style={resultBtnStyle(result === 'defender')} onClick={() => setResult('defender')}>Opponent Wins</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>
          <div>
            <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>Registering Player Score <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
            <input type="number" min="0" value={attackerScore} onChange={e => setAttackerScore(e.target.value)} placeholder="e.g. 42" style={inputStyle} />
          </div>
          <div>
            <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>Opponent Score <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
            <input type="number" min="0" value={defenderScore} onChange={e => setDefenderScore(e.target.value)} placeholder="e.g. 18" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ── Battle Chronicles ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Battle Chronicles <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <span style={{ ...sublabelStyle, marginBottom: '0.5rem' }}>Registering Player's Account</span>
            <textarea
              value={attackerNarrative} onChange={e => setAttackerNarrative(e.target.value)}
              rows={5} placeholder="Describe the battle from your perspective…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            <p style={hintStyle}>**bold** &nbsp;·&nbsp; *italic*</p>
          </div>
          <div>
            <span style={{ ...sublabelStyle, marginBottom: '0.5rem' }}>Opponent's Account</span>
            <textarea
              value={defenderNarrative} onChange={e => setDefenderNarrative(e.target.value)}
              rows={5} placeholder="Describe the battle from the opponent's perspective…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            <p style={hintStyle}>**bold** &nbsp;·&nbsp; *italic*</p>
          </div>
        </div>
      </div>

      {error && <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{error}</p>}

      {/* ── Save / Cancel ── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
        <button type="submit" className="btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
      </div>

      {/* ── Delete Battle ── */}
      <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--border-dim)' }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem',
        }}>
          Danger Zone
        </p>

        {!confirmDelete ? (
          <button type="button" style={dangerBtnStyle} onClick={() => setConfirmDelete(true)}>
            Delete Battle Record
          </button>
        ) : (
          <div style={{ border: '1px solid #7a2020', padding: '1.25rem', background: 'rgba(224,90,90,0.05)' }}>
            <p style={{ color: '#e05a5a', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Are you sure? This battle record will be permanently deleted and cannot be recovered.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                style={{ ...dangerBtnConfirmStyle, opacity: deleting ? 0.6 : 1 }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete Permanently'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
