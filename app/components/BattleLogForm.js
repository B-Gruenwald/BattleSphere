'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { applyEventBonuses, applyTerritoryCascade } from '@/app/lib/influence';

const BATTLE_TYPES = [
  'KillTeam / Gang War',
  'Boarding Action',
  'Combat Patrol',
  'Incursion',
  'Strike Force',
  'Onslaught',
  'Apocalypse',
];

const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_PHOTO_MB = 10;

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

export default function BattleLogForm({ campaign, territories, factions, members, userId, preselectedTerritoryId, memberArmies }) {
  const router = useRouter();
  const supabase = createClient();

  const sortedMembers = [...members].sort((a, b) => a.username.localeCompare(b.username));
  const sortedTerritories = buildTerritoryTree(territories);

  const [headline,         setHeadline]          = useState('');
  const [battleType,       setBattleType]         = useState('');
  const [scenario,         setScenario]           = useState('');
  const [territoryId,      setTerritoryId]        = useState(preselectedTerritoryId || '');
  const [attackerPlayerId, setAttackerPlayer]     = useState(userId || '');
  const [defenderPlayerId, setDefenderPlayer]     = useState('');
  const [attackerFactionId,setAttacker]           = useState('');
  const [defenderFactionId,setDefender]           = useState('');
  const [attackerArmyId,   setAttackerArmyId]     = useState('');
  const [defenderArmyId,   setDefenderArmyId]     = useState('');
  const [attackerArmyType, setAttackerArmyType]   = useState('');
  const [defenderArmyType, setDefenderArmyType]   = useState('');
  const [attackerArmyList, setAttackerArmyList]   = useState('');
  const [defenderArmyList, setDefenderArmyList]   = useState('');
  const [result,           setResult]             = useState('');
  const [attackerScore,    setAttackerScore]      = useState('');
  const [defenderScore,    setDefenderScore]      = useState('');
  const [attackerNarrative,setAttackerNarrative]  = useState('');
  const [defenderNarrative,setDefenderNarrative]  = useState('');
  const [submitting,       setSubmitting]         = useState(false);
  const [submitLabel,      setSubmitLabel]        = useState('Record Battle');
  const [error,            setError]              = useState('');
  const [pendingPhotos,    setPendingPhotos]      = useState([]);
  const [photoError,       setPhotoError]         = useState('');

  // Optional section toggles
  const [showScenario,    setShowScenario]    = useState(false);
  const [showArmyDetails, setShowArmyDetails] = useState(false);
  const [showScores,      setShowScores]      = useState(false);
  const [showNarrative,   setShowNarrative]   = useState(false);

  // Auto-fill attacker faction when player changes
  useEffect(() => {
    if (attackerPlayerId) {
      const member = members.find(m => m.user_id === attackerPlayerId);
      if (member?.faction_id) setAttacker(member.faction_id);
    }
    setAttackerArmyId('');
  }, [attackerPlayerId]);

  // Auto-fill defender faction when player changes
  useEffect(() => {
    if (defenderPlayerId) {
      const member = members.find(m => m.user_id === defenderPlayerId);
      if (member?.faction_id) setDefender(member.faction_id);
    }
    setDefenderArmyId('');
  }, [defenderPlayerId]);

  // Auto-fill faction when army is selected (if army has a faction assigned in this campaign)
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

  const attackerLabel = members.find(m => m.user_id === attackerPlayerId)?.username ?? 'Player A';
  const defenderLabel = members.find(m => m.user_id === defenderPlayerId)?.username ?? 'Player B';

  // ── Photo handlers ───────────────────────────────────────────────────────────
  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setPhotoError('');
    const toAdd = [];
    for (const file of files) {
      if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) { setPhotoError(`"${file.name}" is not a supported type.`); return; }
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) { setPhotoError(`"${file.name}" exceeds ${MAX_PHOTO_MB} MB.`); return; }
      toAdd.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setPendingPhotos(prev => [...prev, ...toAdd]);
  }
  function removePendingPhoto(index) {
    setPendingPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  }
  async function uploadPhotosForBattle(battleId) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName || !pendingPhotos.length) return;
    for (const { file } of pendingPhotos) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'battlesphere_unsigned');
        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
        const cloudData = await cloudRes.json();
        if (!cloudData.secure_url) continue;
        await fetch('/api/photos/battle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ battleId, url: cloudData.secure_url }) });
      } catch (err) { console.error('Photo upload error:', err); }
    }
  }

  // ── Influence update ─────────────────────────────────────────────────────────
  async function updateInfluence() {
    const mode = campaign.influence_mode || 'standard';
    if (mode === 'off') return;
    if (!territoryId || !attackerFactionId || !defenderFactionId || !result) return;
    const deltas = {};
    if (mode === 'standard') {
      if (result === 'attacker') { deltas[attackerFactionId] = 3; deltas[defenderFactionId] = 1; }
      else if (result === 'defender') { deltas[defenderFactionId] = 3; deltas[attackerFactionId] = 1; }
      else if (result === 'draw') { deltas[attackerFactionId] = 2; deltas[defenderFactionId] = 2; }
    } else if (mode === 'victory') {
      if (result === 'attacker') deltas[attackerFactionId] = 1;
      else if (result === 'defender') deltas[defenderFactionId] = 1;
    }
    const factionIds = Object.keys(deltas);
    if (!factionIds.length) return;
    const { data: current, error: fetchError } = await supabase.from('territory_influence').select('*').eq('territory_id', territoryId).in('faction_id', factionIds);
    if (fetchError) { console.error('Influence fetch error:', fetchError); return; }
    const getPoints = (fid) => current?.find(i => i.faction_id === fid)?.influence_points ?? 0;
    const updates = factionIds.map(fid => ({ campaign_id: campaign.id, territory_id: territoryId, faction_id: fid, influence_points: getPoints(fid) + deltas[fid] }));
    const { error: upsertError } = await supabase.from('territory_influence').upsert(updates, { onConflict: 'territory_id,faction_id' });
    if (upsertError) console.error('Influence upsert error:', upsertError);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!attackerPlayerId) { setError('Please select the Registering Player.'); return; }
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
    setSubmitLabel('Recording…');

    const { data: battle, error: insertError } = await supabase
      .from('battles')
      .insert({
        campaign_id:           campaign.id,
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
        attacker_score:        attackerScore ? parseInt(attackerScore) : 0,
        defender_score:        defenderScore ? parseInt(defenderScore) : 0,
        attacker_narrative:    attackerNarrative.trim() || null,
        defender_narrative:    defenderNarrative.trim() || null,
        logged_by:             userId,
        army_id_p1:            attackerArmyId           || null,
        army_id_p2:            defenderArmyId           || null,
      })
      .select()
      .single();

    if (insertError) { setError(insertError.message); setSubmitting(false); setSubmitLabel('Record Battle'); return; }

    await applyEventBonuses(supabase, battle);
    await updateInfluence();
    await applyTerritoryCascade(supabase, battle);

    if (pendingPhotos.length > 0) {
      setSubmitLabel(`Uploading ${pendingPhotos.length} photo${pendingPhotos.length > 1 ? 's' : ''}…`);
      await uploadPhotosForBattle(battle.id);
    }

    // Discord notification
    const attackerFaction = factions.find(f => f.id === attackerFactionId);
    const defenderFaction = factions.find(f => f.id === defenderFactionId);
    const territory       = territories.find(t => t.id === territoryId);
    fetch('/api/discord/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'battle', campaignId: campaign.id, campaignSlug: campaign.slug, battleId: battle.id, headline: headline.trim() || null, attackerName: attackerFaction?.name ?? 'Unknown', defenderName: defenderFaction?.name ?? 'Unknown', winnerFactionId: winnerFactionId || null, attackerFactionId, attackerScore: attackerScore ? parseInt(attackerScore) : 0, defenderScore: defenderScore ? parseInt(defenderScore) : 0, territoryName: territory?.name ?? null }),
    }).catch(() => {});

    // In-app notifications
    {
      const loggerUsername      = members.find(m => m.user_id === userId)?.username ?? 'Your opponent';
      const attackerFactionName = factions.find(f => f.id === attackerFactionId)?.name ?? 'Unknown';
      const defenderFactionName = factions.find(f => f.id === defenderFactionId)?.name ?? 'Unknown';
      const territoryName       = territories.find(t => t.id === territoryId)?.name ?? null;
      const battleTitle         = headline.trim() || null;
      const notifTitle = battleTitle ? `${loggerUsername} has reported your battle: ${battleTitle}` : `${loggerUsername} has reported your latest battle`;
      const resultText = winnerFactionId === attackerFactionId ? `${attackerFactionName} emerged victorious` : winnerFactionId === defenderFactionId ? `${defenderFactionName} emerged victorious` : 'the battle ended in a draw';
      const locationText = territoryName ? `${attackerFactionName} vs ${defenderFactionName} in ${territoryName}` : `${attackerFactionName} vs ${defenderFactionName} in ${campaign.name}`;
      const notifBody = `${locationText} — ${resultText}. Check the full report and add your own perspective.`;
      const recipientsToNotify = [];
      if (attackerPlayerId && attackerPlayerId !== userId) recipientsToNotify.push(attackerPlayerId);
      if (defenderPlayerId && defenderPlayerId !== userId) recipientsToNotify.push(defenderPlayerId);
      for (const recipientId of recipientsToNotify) {
        fetch('/api/notifications/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientId, type: 'battle_opponent', title: notifTitle, body: notifBody, link: `/c/${campaign.slug}/battle/${battle.id}` }) }).catch(() => {});
      }
    }

    router.push(`/c/${campaign.slug}/battle/${battle.id}`);
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

  // Army lists for each player
  const attackerArmies = memberArmies && attackerPlayerId ? (memberArmies[attackerPlayerId] || []) : [];
  const defenderArmies = memberArmies && defenderPlayerId ? (memberArmies[defenderPlayerId] || []) : [];
  const hasAnyArmies   = attackerArmies.length > 0 || defenderArmies.length > 0;

  return (
    <form onSubmit={handleSubmit} className="battle-form" style={{ maxWidth: '700px' }}>

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
          {territoryId && result && (() => {
            const mode = campaign.influence_mode || 'standard';
            if (mode === 'off') return null;
            const winnerName = result === 'attacker' ? factions.find(f => f.id === attackerFactionId)?.name || 'Registering Player' : factions.find(f => f.id === defenderFactionId)?.name || 'Opponent';
            let hint = null;
            if (mode === 'standard') hint = result === 'draw' ? '⬡ Both factions will gain +2 influence here.' : `⬡ ${winnerName} will gain +3 influence here; the other faction gains +1.`;
            else if (mode === 'victory') hint = result === 'draw' ? '⬡ No influence is awarded for draws in this campaign.' : `⬡ ${winnerName} will gain +1 influence here.`;
            return hint ? <p style={hintStyle}>{hint}</p> : null;
          })()}
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
              <label style={labelStyle}>Registering Player <span style={{ color: '#e05a5a' }}>*</span></label>
              <select value={attackerPlayerId} onChange={e => setAttackerPlayer(e.target.value)} style={inputStyle} required>
                <option value="">— Select player —</option>
                {sortedMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
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
                {sortedMembers.filter(m => m.user_id !== attackerPlayerId).map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
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

        {/* Single army details toggle — only shown when at least one player has armies */}
        {(attackerPlayerId || defenderPlayerId) && hasAnyArmies && (
          <>
            <button type="button" style={optToggleStyle} onClick={() => setShowArmyDetails(v => !v)}>
              {showArmyDetails ? '▾ Hide army details' : '▸ Add army details'}
            </button>
            {showArmyDetails && (
              <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.75rem' }}>
                {/* Attacker army details */}
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
                {/* Defender army details */}
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
      </div>

      {/* ── Result ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Result <span style={{ color: '#e05a5a' }}>*</span></label>
        <div className="result-btn-row" style={{ display: 'flex', gap: '0.75rem' }}>
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

      {/* ── Narrative & Photos ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <label style={labelStyle}>Battle Photos</label>
          <label style={{ cursor: 'pointer' }}>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple style={{ display: 'none' }} onChange={handlePhotoSelect} disabled={submitting} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: submitting ? 'var(--text-muted)' : 'var(--text-gold)', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              + Add Photos
            </span>
          </label>
        </div>
        {photoError && <p style={{ color: '#e05a5a', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{photoError}</p>}
        {pendingPhotos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {pendingPhotos.map((p, i) => (
              <div key={i} style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden' }}>
                <img src={p.previewUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', border: '1px solid var(--border-dim)' }} />
                {!submitting && (
                  <button type="button" onClick={() => removePendingPhoto(i)} title="Remove photo" style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.75)', border: 'none', color: '#e05a5a', cursor: 'pointer', padding: '2px 7px', fontSize: '0.85rem', lineHeight: 1 }}>×</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem', marginBottom: '0.5rem' }}>No photos queued yet.</p>
        )}
        <button type="button" style={optToggleStyle} onClick={() => setShowNarrative(v => !v)}>
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

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button type="submit" className="btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
          {submitting ? submitLabel : 'Record Battle'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()} disabled={submitting}>Cancel</button>
      </div>
    </form>
  );
}
