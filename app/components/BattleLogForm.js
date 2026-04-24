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

export default function BattleLogForm({ campaign, territories, factions, members, userId, preselectedTerritoryId }) {
  const router = useRouter();
  const supabase = createClient();

  // Sorted members (alphabetical) — used in both player dropdowns
  const sortedMembers = [...members].sort((a, b) => a.username.localeCompare(b.username));
  // Hierarchically ordered territories
  const sortedTerritories = buildTerritoryTree(territories);

  const [headline,         setHeadline]          = useState('');
  const [battleType,       setBattleType]         = useState('');
  const [scenario,         setScenario]           = useState('');
  const [territoryId,      setTerritoryId]        = useState(preselectedTerritoryId || '');
  // Default the registering player to the current user
  const [attackerPlayerId, setAttackerPlayer]     = useState(userId || '');
  const [defenderPlayerId, setDefenderPlayer]     = useState('');
  const [attackerFactionId,setAttacker]           = useState('');
  const [defenderFactionId,setDefender]           = useState('');
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

  // Pending photos: queued locally before the battle is saved
  const [pendingPhotos,    setPendingPhotos]      = useState([]); // [{ file, previewUrl }]
  const [photoError,       setPhotoError]         = useState('');

  // Auto-fill attacker faction (also fires on mount because attackerPlayerId defaults to userId)
  useEffect(() => {
    if (attackerPlayerId) {
      const member = members.find(m => m.user_id === attackerPlayerId);
      if (member?.faction_id) setAttacker(member.faction_id);
    }
  }, [attackerPlayerId]);

  useEffect(() => {
    if (defenderPlayerId) {
      const member = members.find(m => m.user_id === defenderPlayerId);
      if (member?.faction_id) setDefender(member.faction_id);
    }
  }, [defenderPlayerId]);

  const winnerFactionId =
    result === 'attacker' ? attackerFactionId :
    result === 'defender' ? defenderFactionId : null;

  // ── Photo queue handlers ─────────────────────────────────────────────────────
  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setPhotoError('');

    const toAdd = [];
    for (const file of files) {
      if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
        setPhotoError(`"${file.name}" is not a supported type (JPG, PNG, WebP, GIF).`);
        return;
      }
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        setPhotoError(`"${file.name}" exceeds the ${MAX_PHOTO_MB} MB limit.`);
        return;
      }
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

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: 'POST', body: formData }
        );
        const cloudData = await cloudRes.json();
        if (!cloudData.secure_url) continue;

        await fetch('/api/photos/battle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ battleId, url: cloudData.secure_url }),
        });
      } catch (err) {
        console.error('Photo upload error:', err);
      }
    }
  }

  // ── Influence update helper ──────────────────────────────────────────────────
  async function updateInfluence() {
    const mode = campaign.influence_mode || 'standard';
    if (mode === 'off') return;
    if (!territoryId || !attackerFactionId || !defenderFactionId || !result) return;

    const deltas = {};
    if (mode === 'standard') {
      if (result === 'attacker') {
        deltas[attackerFactionId] = 3;
        deltas[defenderFactionId] = 1;
      } else if (result === 'defender') {
        deltas[defenderFactionId] = 3;
        deltas[attackerFactionId] = 1;
      } else if (result === 'draw') {
        deltas[attackerFactionId] = 2;
        deltas[defenderFactionId] = 2;
      }
    } else if (mode === 'victory') {
      if (result === 'attacker') {
        deltas[attackerFactionId] = 1;
      } else if (result === 'defender') {
        deltas[defenderFactionId] = 1;
      }
    }

    const factionIds = Object.keys(deltas);
    if (factionIds.length === 0) return;

    const { data: current, error: fetchError } = await supabase
      .from('territory_influence')
      .select('*')
      .eq('territory_id', territoryId)
      .in('faction_id', factionIds);

    if (fetchError) { console.error('Influence fetch error:', fetchError); return; }

    const getPoints = (factionId) =>
      current?.find(i => i.faction_id === factionId)?.influence_points ?? 0;

    const updates = factionIds.map(fid => ({
      campaign_id:      campaign.id,
      territory_id:     territoryId,
      faction_id:       fid,
      influence_points: getPoints(fid) + deltas[fid],
    }));

    const { error: upsertError } = await supabase
      .from('territory_influence')
      .upsert(updates, { onConflict: 'territory_id,faction_id' });

    if (upsertError) { console.error('Influence upsert error:', upsertError); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // ── Validation ──────────────────────────────────────────────────────────────
    if (!attackerPlayerId) {
      setError('Please select the Registering Player.');
      return;
    }

    if (!attackerFactionId) {
      const attackerMember = members.find(m => m.user_id === attackerPlayerId);
      if (attackerMember && !attackerMember.faction_id) {
        setError('The Registering Player has no faction assigned. They can set one from their Player Profile, or select one manually in the Faction field above.');
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
    setSubmitLabel('Recording…');

    const { data: battle, error: insertError } = await supabase
      .from('battles')
      .insert({
        campaign_id:           campaign.id,
        headline:              headline.trim()     || null,
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
        attacker_score:        attackerScore ? parseInt(attackerScore) : 0,
        defender_score:        defenderScore ? parseInt(defenderScore) : 0,
        attacker_narrative:    attackerNarrative.trim() || null,
        defender_narrative:    defenderNarrative.trim() || null,
        logged_by:             userId,
      })
      .select()
      .single();

    if (insertError) { setError(insertError.message); setSubmitting(false); setSubmitLabel('Record Battle'); return; }

    // applyEventBonuses must run BEFORE updateInfluence so the influence state
    // check reflects the pre-battle territory state (not yet modified by base influence).
    await applyEventBonuses(supabase, battle);
    await updateInfluence();
    await applyTerritoryCascade(supabase, battle);

    // Upload any photos queued before submission
    if (pendingPhotos.length > 0) {
      setSubmitLabel(`Uploading ${pendingPhotos.length} photo${pendingPhotos.length > 1 ? 's' : ''}…`);
      await uploadPhotosForBattle(battle.id);
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
    <form onSubmit={handleSubmit} className="battle-form" style={{ maxWidth: '700px' }}>

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
        <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
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
            {sortedTerritories.map(t => (
              <option key={t.id} value={t.id}>
                {'\u00a0\u00a0\u00a0\u00a0'.repeat(t.depth - 1)}{t.depth > 1 ? '↳ ' : ''}{t.name}{t.depth > 1 ? ` (${t.type || 'sub-territory'})` : ''}
              </option>
            ))}
          </select>
          {territoryId && result && (() => {
            const mode = campaign.influence_mode || 'standard';
            if (mode === 'off') return null;
            const winnerName = result === 'attacker'
              ? factions.find(f => f.id === attackerFactionId)?.name || 'Registering Player'
              : factions.find(f => f.id === defenderFactionId)?.name || 'Opponent';
            let hint = null;
            if (mode === 'standard') {
              hint = result === 'draw'
                ? '⬡ Both factions will gain +2 influence here.'
                : `⬡ ${winnerName} will gain +3 influence here; the other faction gains +1.`;
            } else if (mode === 'victory') {
              hint = result === 'draw'
                ? '⬡ No influence is awarded for draws in this campaign.'
                : `⬡ ${winnerName} will gain +1 influence here.`;
            }
            return hint ? <p style={hintStyle}>{hint}</p> : null;
          })()}
        </div>
      </div>

      {/* ── Players & Armies ── */}
      <div style={sectionStyle}>
        <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* Registering Player column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Registering Player <span style={{ color: '#e05a5a' }}>*</span></label>
              <select value={attackerPlayerId} onChange={e => setAttackerPlayer(e.target.value)} style={inputStyle} required>
                <option value="">— Select player —</option>
                {sortedMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
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
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace', fontSize: '1rem' }}
              />
            </div>
          </div>

          {/* Opponent column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Opponent <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span></label>
              <select value={defenderPlayerId} onChange={e => setDefenderPlayer(e.target.value)} style={inputStyle}>
                <option value="">— Select player —</option>
                {sortedMembers.filter(m => m.user_id !== attackerPlayerId).map(m => (
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
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace', fontSize: '1rem' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Result ── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Battle Result</label>
        <div className="result-btn-row" style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" style={resultBtnStyle(result === 'attacker')} onClick={() => setResult('attacker')}>Registering Player Wins</button>
          <button type="button" style={resultBtnStyle(result === 'draw')}     onClick={() => setResult('draw')}>Draw</button>
          <button type="button" style={resultBtnStyle(result === 'defender')} onClick={() => setResult('defender')}>Opponent Wins</button>
        </div>
        <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem' }}>
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
        <div className="form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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

      {/* ── Battle Photos ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <label style={labelStyle}>
            Battle Photos <span style={{ opacity: 0.5, fontSize: '0.55rem' }}>(optional)</span>
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
              disabled={submitting}
            />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.58rem',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: submitting ? 'var(--text-muted)' : 'var(--text-gold)',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}>
              + Add Photos
            </span>
          </label>
        </div>

        {photoError && (
          <p style={{ color: '#e05a5a', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{photoError}</p>
        )}

        {pendingPhotos.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '0.65rem',
          }}>
            {pendingPhotos.map((p, i) => (
              <div key={i} style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden' }}>
                <img
                  src={p.previewUrl}
                  alt=""
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    border: '1px solid var(--border-dim)',
                  }}
                />
                {!submitting && (
                  <button
                    type="button"
                    onClick={() => removePendingPhoto(i)}
                    title="Remove photo"
                    style={{
                      position: 'absolute', top: '4px', right: '4px',
                      background: 'rgba(0,0,0,0.75)', border: 'none',
                      color: '#e05a5a', cursor: 'pointer',
                      padding: '2px 7px', fontSize: '0.85rem', lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
            No photos queued. Use "+ Add Photos" to attach images — they'll be uploaded when you record the battle.
          </p>
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
