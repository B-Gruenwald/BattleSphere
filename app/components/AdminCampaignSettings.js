'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const SETTINGS = ['Gothic Sci-Fi', 'High Fantasy'];

// ── Name pools for auto-rename ────────────────────────────────────────────────
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SYSTEM_NAMES = {
  'Gothic Sci-Fi': ['Gorond System','Noralus System','Vespator System','Hykos System','Mordain System','Terrath System','Pylox System','Crethus System','Volkan System','Ashenveil System','Grimholt System','Solvaine System','Krendar System','Malthos System','Darkspire System','Ironveil System','Sundrath System','Coldmere System','Ashfall System','Brennar System'],
  'High Fantasy':  ['Emberveil Gate','Verdant Arch','Duskwatch Gate','Brightspire Gate','Shadowmere Gate','Ironpass Gate','Wildmere Gate','Stormveil Gate','Frostgate','Pale Crossing','Crimson Arch','Cobalt Gate','Thornreach Gate','Ashenveil Gate','Pearlgate','Gloomveil Gate','Stoneheart Gate','Tidewatch Gate','Cindergate','Starborn Gate'],
};
const SUB_TYPES = {
  'Gothic Sci-Fi': ['Hive World','Forge World','Death World','Shrine World','Space Port','Mining Colony','Agri World','Void Station'],
  'High Fantasy':  ['Ruined Citadel','Enchanted Forest','Cursed Dungeon','Ancient Shrine','Forsaken Town','Spectral Marshes','Dragon Ridge','Forgotten Hold'],
};
const LANDMARK_TYPES = {
  'Gothic Sci-Fi': ['Manufactorum','Fortress of Redemption','Relay Station','Promethium Field','Hab District','Plasma Conduit','Shrine','Servitor Bay'],
  'High Fantasy':  ["Arcane Obelisk","Dragon's Hollow","Whispering Stones","Forsaken Watch","Cursed Altar","Hidden Grotto","Blighted Grove","Shattered Keep"],
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminCampaignSettings({ campaign, slug }) {
  const supabase = createClient();

  const [name,          setName]          = useState(campaign.name || '');
  const [description,   setDescription]   = useState(campaign.description || '');
  const [setting,       setSetting]       = useState(campaign.setting || 'Gothic Sci-Fi');
  const [influenceMode, setInfluenceMode] = useState(campaign.influence_mode || 'standard');
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [error,         setError]         = useState('');

  // Rename modal state
  const [pendingSetting,  setPendingSetting]  = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renaming,        setRenaming]        = useState(false);

  const dirty = name !== campaign.name
    || description !== (campaign.description || '')
    || setting !== campaign.setting
    || influenceMode !== (campaign.influence_mode || 'standard');

  async function save(overrideSetting) {
    const saveSetting = overrideSetting !== undefined ? overrideSetting : setting;
    if (!name.trim()) { setError('Campaign name cannot be empty.'); return; }
    setSaving(true);
    setSaved(false);
    setError('');

    const { error: err } = await supabase
      .from('campaigns')
      .update({
        name:           name.trim(),
        description:    description.trim() || null,
        setting:        saveSetting,
        influence_mode: influenceMode,
      })
      .eq('id', campaign.id);

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
    }
  }

  function handleSettingClick(s) {
    if (s === setting) return;
    setPendingSetting(s);
    setShowRenameModal(true);
    setSaved(false);
  }

  function handleKeepAndSwitch() {
    setSetting(pendingSetting);
    setShowRenameModal(false);
    setPendingSetting(null);
    // User still needs to click Save Settings to persist
  }

  async function handleRenameAndSwitch() {
    const newSetting = pendingSetting;
    setRenaming(true);
    setError('');
    try {
      // 1. Fetch all territories for this campaign
      const { data: territories, error: fetchErr } = await supabase
        .from('territories')
        .select('*')
        .eq('campaign_id', campaign.id);
      if (fetchErr) throw fetchErr;

      const depth1 = territories.filter(t => t.depth === 1);
      const depth2 = territories.filter(t => t.depth === 2);
      const depth3 = territories.filter(t => t.depth === 3);

      const pool1  = SYSTEM_NAMES[newSetting]   || SYSTEM_NAMES['Gothic Sci-Fi'];
      const pool2  = SUB_TYPES[newSetting]       || SUB_TYPES['Gothic Sci-Fi'];
      const pool3  = LANDMARK_TYPES[newSetting]  || LANDMARK_TYPES['Gothic Sci-Fi'];

      const newNames1 = shuffled(pool1).slice(0, depth1.length);
      const subPool   = shuffled(pool2);
      const lmPool    = shuffled(pool3);

      // Map parent id → new name (used to prefix depth-2 names)
      const parentNameMap = {};
      depth1.forEach((t, i) => { parentNameMap[t.id] = newNames1[i]; });

      // 2. Build update payloads
      const updates = [
        ...depth1.map((t, i) => ({ id: t.id, name: newNames1[i], type: null })),
        ...depth2.map((t, i) => {
          const newType    = subPool[i % subPool.length];
          const parentFirst = (parentNameMap[t.parent_id] || '').split(' ')[0];
          return { id: t.id, name: `${parentFirst} ${newType}`, type: newType };
        }),
        ...depth3.map((t, i) => ({
          id: t.id, name: lmPool[i % lmPool.length], type: 'Landmark',
        })),
      ];

      // 3. Apply updates
      await Promise.all(updates.map(u =>
        supabase.from('territories')
          .update({ name: u.name, type: u.type })
          .eq('id', u.id)
      ));

      // 4. Save setting and other campaign fields
      const { error: saveErr } = await supabase
        .from('campaigns')
        .update({
          name:           name.trim(),
          description:    description.trim() || null,
          setting:        newSetting,
          influence_mode: influenceMode,
        })
        .eq('id', campaign.id);
      if (saveErr) throw saveErr;

      setSetting(newSetting);
      setSaved(true);
    } catch (e) {
      setError(e.message || 'Something went wrong during rename.');
    }
    setRenaming(false);
    setShowRenameModal(false);
    setPendingSetting(null);
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-2)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.65rem 0.9rem',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontSize: '0.52rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '0.35rem',
  };

  return (
    <>
      {/* ── Rename modal ─────────────────────────────────────────────────── */}
      {showRenameModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border-dim)',
            padding: '2rem', maxWidth: '440px', width: '90%',
          }}>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: '0.62rem',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--text-gold)', marginBottom: '1rem',
            }}>
              Switch to {pendingSetting}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1.75rem' }}>
              Would you like to auto-generate new territory names in the{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{pendingSetting}</strong> style,
              or keep your existing names?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleRenameAndSwitch}
                disabled={renaming}
                style={{ opacity: renaming ? 0.6 : 1 }}
              >
                {renaming ? 'Renaming territories…' : 'Auto-generate new names'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleKeepAndSwitch}
                disabled={renaming}
              >
                Keep existing names
              </button>
              <button
                type="button"
                onClick={() => { setShowRenameModal(false); setPendingSetting(null); }}
                disabled={renaming}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings form ────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '2rem' }}>
        {/* Name */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Campaign Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setSaved(false); }}
            style={inputStyle}
            placeholder="My Campaign"
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={e => { setDescription(e.target.value); setSaved(false); }}
            rows={3}
            placeholder="What is this campaign about?"
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {/* Setting */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={labelStyle}>Genre Setting</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {SETTINGS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleSettingClick(s)}
                style={{
                  padding: '0.5rem 0.9rem',
                  cursor: 'pointer',
                  border: `1px solid ${setting === s ? 'var(--gold)' : 'var(--border-dim)'}`,
                  background: setting === s ? 'rgba(183,140,64,0.12)' : 'rgba(255,255,255,0.02)',
                  color: setting === s ? 'var(--text-gold)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.58rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  transition: 'all 0.15s',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Influence Mode */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={labelStyle}>Influence Mode</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            {[
              { value: 'standard', label: 'Standard',      desc: 'Win: +3 / +1 · Draw: +2 / +2' },
              { value: 'victory',  label: 'Victory Points', desc: 'Win: +1 for winner only · Draw: none' },
              { value: 'off',      label: 'Manual',         desc: 'No automatic influence — organiser manages manually' },
            ].map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setInfluenceMode(value); setSaved(false); }}
                style={{
                  padding: '0.5rem 0.9rem',
                  cursor: 'pointer',
                  border: `1px solid ${influenceMode === value ? 'var(--gold)' : 'var(--border-dim)'}`,
                  background: influenceMode === value ? 'rgba(183,140,64,0.12)' : 'rgba(255,255,255,0.02)',
                  color: influenceMode === value ? 'var(--text-gold)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.58rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  transition: 'all 0.15s',
                }}
                title={desc}
              >
                {label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
            {influenceMode === 'standard' && 'Battle results automatically award influence points: winner +3, loser +1, draw +2 each.'}
            {influenceMode === 'victory'  && 'Only the winner gains influence (+1 per victory). Draws and losses award nothing.'}
            {influenceMode === 'off'      && 'Influence is not updated automatically. Use the manual override on each territory to set values yourself.'}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => save()}
            disabled={saving || !dirty}
            style={{ opacity: (saving || !dirty) ? 0.5 : 1 }}
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && (
            <span style={{ color: 'var(--text-gold)', fontSize: '0.8rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ✓ Saved
            </span>
          )}
          {error && (
            <span style={{ color: '#e05a5a', fontSize: '0.82rem' }}>{error}</span>
          )}
        </div>
      </div>
    </>
  );
}
