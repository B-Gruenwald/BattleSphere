'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { reverseInfluence, reverseEventBonuses, reverseTerritoryCascade } from '@/app/lib/influence';

const BATTLE_TYPES = [
  'KillTeam / Gang War',
  'Boarding Action',
  'Combat Patrol',
  'Incursion',
  'Strike Force',
  'Onslaught',
  'Apocalypse',
];

// Build a hierarchically ordered territory list: parent → its children → next parent…
function buildTerritoryTree(territories) {
  const roots = territories
    .filter(t => !t.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const result = [];
  for (const root of roots) {
    result.push(root);
    const children = territories
      .filter(t => t.parent_id === root.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    result.push(...children);
  }
  return result;
}

export default function BattleEditForm({ battle, campaign, territories, factions, members, memberArmies }) {
  const router  = useRouter();
  const supabase = createClient();

  const sortedTerritories = buildTerritoryTree(territories);

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
  const [attackerArmyId,   setAttackerArmyId]     = useState(battle.army_id_p1          || '');
  const [defenderArmyId,   setDefenderArmyId]     = useState(battle.army_id_p2          || '');
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

  // Optional section toggles — pre-open if data already exists
  const [showScenario,    setShowScenario]    = useState(!!battle.scenario);
  const [showArmyDetails, setShowArmyDetails] = useState(!!(battle.army_id_p1 || battle.army_id_p2 || battle.attacker_army_type || battle.defender_army_type || battle.attacker_army_list || battle.defender_army_list));
  const [showScores,      setShowScores]      = useState(!!(battle.attacker_score || battle.defender_score));
  const [showNarrative,   setShowNarrative]   = useState(!!(battle.attacker_narrative || battle.defender_narrative));

  // Refs prevent the auto-fill useEffects from overwriting saved faction IDs on mount
  const attackerEffectRan = useRef(false);
  const defenderEffectRan = useRef(false);

  useEffect(() => {
    if (!attackerEffectRan.current) { attackerEffectRan.current = true; return; }
    if (attackerPlayerId) {
      const member = members.find(m => m.user_id === attackerPlayerId);
      if (member?.faction_id) setAttacker(member.faction_id);
    }
    setAttackerArmyId('');
  }, [attackerPlayerId]);

  useEffect(() => {
    if (!defenderEffectRan.current) { defenderEffectRan.current = true; return; }
    if (defenderPlayerId) {
      const member = members.find(m => m.user_id === defenderPlayerId);
      if (member?.faction_id) setDefender(member.faction_id);
    }
    setDefenderArmyId('');
  }, [defenderPlayerId]);

  // Auto-fill faction when army is selected
  function handleAttackerArmyChange(armyId) {
    setAttackerArmyId(armyId);
    if (armyId && memberArmies && attackerPlayerId) {
      const army = (memberArmies[attackerPlayerId] || []).find(a => a.armyId === armyId);
      if (army?.faction_id) setAttacker(army.faction_id);
    }
  }
  function handleDefenderArmyChange(armyId) {
    setDefenderArmyId(armyId);
    if (armyId && memberArmies && defenderPlayerId) {
      const army = (memberArmies[defenderPlayerId] || []).find(a => a.armyId === armyId);
      if (army?.faction_id) setDefender(army.faction_id);
    }
  }

  const winnerFactionId =
    result === 'attacker' ? attackerFactionId :
    result === 'defender' ? defenderFactionId : null;

  const attackerLabel = attackerFactionId
    ? (factions.find(f => f.id === attackerFactionId)?.name ?? 'Player A')
    : (members.find(m => m.user_id === attackerPlayerId)?.username ?? 'Player A');
  const defenderLabel = defenderFactionId
    ? (factions.find(f => f.id === defenderFactionId)?.name ?? 'Player B')
    : (members.find(m => m.user_id === defenderPlayerId)?.username ?? 'Player B');

  const attackerArmies = memberArmies && attackerPlayerId ? (memberArmies[attackerPlayerId] || []) : [];
  const defenderArmies = memberArmies && defenderPlayerId ? (memberArmies[defenderPlayerId] || []) : [];
  const hasAnyArmies   = attackerArmies.length > 0 || defenderArmies.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!attackerFactionId) {
      const m = members.find(m => m.user_id === attackerPlayerId);
      setError(m && !m.faction_id ? 'The Registering Player has no faction assigned. Select one manually above.' : 'Please select a faction for the Registering Player.');
      return;
    }
    if (!defenderFactionId) {
      const m = defenderPlayerId ? members.find(m => m.user_id === defenderPlayerId) : null;
      setError(m && !m.faction_id ? 'The Opponent has no faction assigned. Select one manually above.' : 'Please select a faction for the Opponent.');
      return;
    }
    if (attackerFactionId === defenderFactionId) { setError('Registering Player and Opponent must be different factions.'); return; }
    if (!result) { setError('Please select a battle result.'); return; }

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
        army_id_p1:            attackerArmyId           || null,
        army_id_p2:            defenderArmyId           || null,
      })
      .eq('id', battle.id)
      .select();

    if (updateError) { setError(updateError.message); setSubmitting(false); return; }
    if (!saved || saved.length === 0) {
      setError('Changes could not be saved — only the Registering Player, Opponent, the player who logged the battle, or the campaign organiser can edit this record.');
      setSubmitting(false);
      return;
    }

    router.push(`/c/${campaign.slug}/battle/${battle.id}`);
  }

  async function handleDelete() {
    setDeleting(true);
    setError('');
    await reverseInfluence(supabase, battle, campaign.influence_mode || 'standard');
    await reverseEventBonuses(supabase, battle);
    await reverseTerritoryCascade(supabase, battle);
    const { error: deleteError } = await supabase.from('battles').delete().eq('id', battle.id);
    if (deleteError) { setError('Could not delete battle: ' + deleteError.message); setDeleting(false); setConfirmDelete(false); return; }
    router.push(`/c/${campaign.slug}/battles`);
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)', padding: '0.65rem 0.9rem', fontSize: '1rem',
    outline: 'none', appearance: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.6rem',
    letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-gold)',
    marginBottom: '0.5rem', fontWeight: '700',
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
  const sectionStyle = { marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-dim)' };
  const hintStyle    = { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontStyle: 'italic' };
  const optToggleStyle = {
    background: 'none', border: 'none', padding: 0,
    fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--text-gold)', cursor: 'pointer',
    marginTop: '0.6rem', display: 'block', fontWeight: 'normal',
  };
  const optPanelStyle = { marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' };
  const dangerBtnStyle = {
    padding: '0.65rem 1.25rem', background: 'transparent', border: '1px solid #7a2020',
    color: '#e05a5a', fontFamily: 'var(--font-display)', fontSize: '0.6rem',
    letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '700px' }}>

      {/* ── Key Facts ── */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '0.9rem' }}>
          <label style={labelStyle}>Battle Headline</label>
          <input type="text" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. The Fall of Hive Secondus, Ambush at the Iron Gate…" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '0.9rem' }}>
          <label style={labelStyle}>Battle Type</label>
          <select value={battleType} onChange={e => setBattleType(e.target.value)} style={inputStyle}>
            <option value="">— Select type —</option>
            {BATTLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Theatre of War</label>
          <select value={territoryId} onChange={e => setTerritoryId(e.target.value)} style={inputStyle}>
            <option value="">— None / Unknown —</option>
            {sortedTerritories.map(t => (
              <option key={t.id} value={t.id}>
                {'    '.repeat(t.depth - 1)}{t.depth > 1 ? '↳ ' : ''}{t.name}{t.depth > 1 ? ` (${t.type || 'sub-territory'})` : ''}
              </option>
            ))}
          </select>
          {territoryId && result && (
            <p style={hintStyle}>
              {result === 'draw'
                ? '⬡ Both factions gained influence here when this battle was first logged.'
                : `⬡ ${result === 'attacker' ? factions.find(f => f.id === attackerFactionId)?.name || 'Registering Player' : factions.find(f => f.id === defenderFactionId)?.name || 'Opponent'} gained +3 influence here when this battle was first logged.`
              }
            </p>
          )}
        </div>
        <button type="button" style={optToggleStyle} onClick={() => setShowScenario(v => !v)}>
          {showScenario ? '▾ Hide scenario' : '▸ Add scenario'}
        </button>
        {showScenario && (
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>Scenario</label>
            <input type="text" value={scenario} onChange={e => setScenario(e.target.value)} placeholder="e.g. Vital Ground, Take &amp; Hold…" style={inputStyle} />
          </div>
        )}
      </div>

      {/* ── Players ── */}
      <div style={sectionStyle}>
        <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* Registering Player */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Registering Player</label>
              <select value={attackerPlayerId} onChange={e => setAttackerPlayer(e.target.value)} style={inputStyle}>
                <option value="">— Select player —</option>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
              </select>
            </div>
            <div>
              <span style={sublabelStyle}>{attackerPlayerId && members.find(m => m.user_id === attackerPlayerId)?.faction_id ? 'Faction (auto-filled)' : 'Faction'}</span>
              <select value={attackerFactionId} onChange={e => setAttacker(e.target.value)} style={inputStyle} required>
                <option value="">— Select faction —</option>
                {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>

          {/* Opponent */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Opponent</label>
              <select value={defenderPlayerId} onChange={e => setDefenderPlayer(e.target.value)} style={inputStyle}>
                <option value="">— Select player —</option>
                {members.filter(m => m.user_id !== attackerPlayerId).map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
              </select>
            </div>
            <div>
              <span style={sublabelStyle}>{defenderPlayerId && members.find(m => m.user_id === defenderPlayerId)?.faction_id ? 'Faction (auto-filled)' : 'Faction'}</span>
              <select value={defenderFactionId} onChange={e => setDefender(e.target.value)} style={inputStyle} required>
                <option value="">— Select faction —</option>
                {factions.filter(f => f.id !== attackerFactionId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Single army details toggle */}
        {(attackerPlayerId || defenderPlayerId) && hasAnyArmies && (
          <>
            <button type="button" style={optToggleStyle} onClick={() => setShowArmyDetails(v => !v)}>
              {showArmyDetails ? '▾ Hide army details' : '▸ Add army details'}
            </button>
            {showArmyDetails && (
              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.75rem' }}>
                <div style={optPanelStyle}>
                  {attackerArmies.length > 0 && (
                    <div>
                      <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-muted)', fontSize: '0.52rem' }}>Deployed Army</label>
                      <select value={attackerArmyId} onChange={e => handleAttackerArmyChange(e.target.value)} style={inputStyle}>
                        <option value="">— None selected —</option>
                        {attackerArmies.map(a => <option key={a.armyId} value={a.armyId}>{a.name}{a.faction_name ? ` · ${a.faction_name}` : ''}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>Army Type &amp; Detachment</label>
                    <input type="text" value={attackerArmyType} onChange={e => setAttackerArmyType(e.target.value)} placeholder="e.g. Space Marines – Gladius Task Force" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>Army List</label>
                    <textarea value={attackerArmyList} onChange={e => setAttackerArmyList(e.target.value)} rows={4} placeholder="Paste or type army list here…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div style={optPanelStyle}>
                  {defenderArmies.length > 0 && (
                    <div>
                      <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-muted)', fontSize: '0.52rem' }}>Deployed Army</label>
                      <select value={defenderArmyId} onChange={e => handleDefenderArmyChange(e.target.value)} style={inputStyle}>
                        <option value="">— None selected —</option>
                        {defenderArmies.map(a => <option key={a.armyId} value={a.armyId}>{a.name}{a.faction_name ? ` · ${a.faction_name}` : ''}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>Army Type &amp; Detachment</label>
                    <input type="text" value={defenderArmyType} onChange={e => setDefenderArmyType(e.target.value)} placeholder="e.g. Aeldari – Aspect Host" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>Army List</label>
                    <textarea value={defenderArmyList} onChange={e => setDefenderArmyList(e.target.value)} rows={4} placeholder="Paste or type army list here…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {/* Always show army type/list fields if they have content but no armies in memberArmies */}
        {!hasAnyArmies && (battle.attacker_army_type || battle.defender_army_type || battle.attacker_army_list || battle.defender_army_list) && (
          <>
            <button type="button" style={optToggleStyle} onClick={() => setShowArmyDetails(v => !v)}>
              {showArmyDetails ? '▾ Hide army details' : '▸ Edit army details'}
            </button>
            {showArmyDetails && (
              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.75rem' }}>
                <div style={optPanelStyle}>
                  <div>
                    <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>Army Type &amp; Detachment</label>
                    <input type="text" value={attackerArmyType} onChange={e => setAttackerArmyType(e.target.value)} placeholder="e.g. Space Marines – Gladius Task Force" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>Army List</label>
                    <textarea value={attackerArmyList} onChange={e => setAttackerArmyList(e.target.value)} rows={4} placeholder="Paste or type army list here…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div style={optPanelStyle}>
                  <div>
                    <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>Army Type &amp; Detachment</label>
                    <input type="text" value={defenderArmyType} onChange={e => setDefenderArmyType(e.target.value)} placeholder="e.g. Aeldari – Aspect Host" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>Army List</label>
                    <textarea value={defenderArmyList} onChange={e => setDefenderArmyList(e.target.value)} rows={4} placeholder="Paste or type army list here…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Result ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Result <span style={{ color: '#e05a5a' }}>*</span></label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" style={resultBtnStyle(result === 'attacker')} onClick={() => setResult('attacker')}>{attackerLabel} Wins</button>
          <button type="button" style={resultBtnStyle(result === 'draw')}     onClick={() => setResult('draw')}>Draw</button>
          <button type="button" style={resultBtnStyle(result === 'defender')} onClick={() => setResult('defender')}>{defenderLabel} Wins</button>
        </div>
        <button type="button" style={optToggleStyle} onClick={() => setShowScores(v => !v)}>
          {showScores ? '▾ Hide scores' : '▸ Add scores'}
        </button>
        {showScores && (
          <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '0.75rem' }}>
            <div>
              <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>{attackerLabel} Score</label>
              <input type="number" min="0" value={attackerScore} onChange={e => setAttackerScore(e.target.value)} placeholder="e.g. 42" style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, fontWeight: 'normal', color: 'var(--text-secondary)' }}>{defenderLabel} Score</label>
              <input type="number" min="0" value={defenderScore} onChange={e => setDefenderScore(e.target.value)} placeholder="e.g. 18" style={inputStyle} />
            </div>
          </div>
        )}
      </div>

      {/* ── Narrative & Chronicle ── */}
      <div style={sectionStyle}>
        <button type="button" style={{ ...optToggleStyle, marginTop: 0 }} onClick={() => setShowNarrative(v => !v)}>
          {showNarrative ? '▾ Hide battle chronicle' : '▸ Add battle chronicle'}
        </button>
        {showNarrative && (
          <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.75rem' }}>
            <div>
              <span style={{ ...sublabelStyle, marginBottom: '0.5rem' }}>{attackerLabel}&apos;s Account</span>
              <textarea value={attackerNarrative} onChange={e => setAttackerNarrative(e.target.value)} rows={5} placeholder="Describe the battle from your perspective…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              <p style={hintStyle}>**bold** &nbsp;·&nbsp; *italic*</p>
            </div>
            <div>
              <span style={{ ...sublabelStyle, marginBottom: '0.5rem' }}>{defenderLabel}&apos;s Account</span>
              <textarea value={defenderNarrative} onChange={e => setDefenderNarrative(e.target.value)} rows={5} placeholder="Describe the battle from the opponent's perspective…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              <p style={hintStyle}>**bold** &nbsp;·&nbsp; *italic*</p>
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
        <button type="submit" className="btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
      </div>

      {/* ── Delete Battle ── */}
      <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--border-dim)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
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
                style={{ padding: '0.65rem 1.25rem', background: 'rgba(224,90,90,0.12)', border: '1px solid #e05a5a', color: '#e05a5a', fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete Permanently'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
