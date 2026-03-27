'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ─── Territory generation ────────────────────────────────────────────────────

const SYSTEM_NAMES = {
  'Gothic Sci-Fi': ['Gorond System','Noralus System','Vespator System','Hykos System','Mordain System','Terrath System','Pylox System','Crethus System','Volkan System','Ashenveil System','Grimholt System','Solvaine System','Krendar System','Malthos System','Darkspire System','Ironveil System','Sundrath System','Coldmere System','Ashfall System','Brennar System'],
  'Space Opera':   ['Aurora System','Nexus System','Helios System','Cygnus System','Lyra System','Orion System','Vega System','Atlas System','Nova System','Solaris System','Rigel System','Altair System','Sirius System','Procyon System','Arcturus System','Spica System','Pollux System','Regulus System','Castor System','Fomalhaut System'],
  'High Fantasy':  ['Ashenmoor','Ironpeak','Stormveil','Thornwald','Crystalfen','Duskfall','Embervast','Frostmere','Grimstone','Hollowdale','Mistwood','Ruinwatch','Shadowfen','Steelhorn','Sunbreak','Thornkeep','Twilight March','Winterhold','Wraithwood','Yewdale'],
  'Historical':    ['Northern Province','Southern Coast','Eastern Highlands','Western Plains','Central Reaches','The River Marches','The Uplands','The Border Territories','The Lowlands','The Disputed Lands','The Old Kingdom','The Free Cities','The Mountain Passes','The Coastal Settlements','The Great Plains','The Heartlands','The Far Reaches','The Frontier','The Ancient Roads','The Crossroads'],
  'Custom':        ['Zone Alpha','Zone Beta','Zone Gamma','Zone Delta','Zone Epsilon','Zone Zeta','Zone Eta','Zone Theta','Zone Iota','Zone Kappa','Zone Lambda','Zone Mu','Zone Nu','Zone Xi','Zone Omicron','Zone Pi','Zone Rho','Zone Sigma','Zone Tau','Zone Upsilon'],
};
const SUB_TYPES = {
  'Gothic Sci-Fi': ['Hive World','Forge World','Death World','Shrine World','Space Port','Mining Colony','Agri World','Void Station'],
  'Space Opera':   ['Colony World','Gas Giant','Ice Moon','Desert Planet','Ocean World','Asteroid Station','Space Platform','Research Colony'],
  'High Fantasy':  ['Forest','Mountain','Plains','River Crossing','Ruined City','Fortress','Sacred Grove','Ancient Ruins'],
  'Historical':    ['Town','Fortress','Village','River Crossing','Mountain Pass','Coastal Port','Ancient Ruins','Border Outpost'],
  'Custom':        ['Area A','Area B','Area C','Area D','Area E','Area F','Area G','Area H'],
};
const LANDMARK_TYPES = {
  'Gothic Sci-Fi': ['Manufactorum','Fortress of Redemption','Relay Station','Promethium Field','Hab District','Plasma Conduit','Shrine','Servitor Bay'],
  'Space Opera':   ['Space Station','Mining Platform','Research Outpost','Comms Relay','Fuel Depot','Shipyard','Hidden Base','Sensor Array'],
  'High Fantasy':  ['Ancient Tower','Dragon Lair','Hidden Cave','Sacred Altar','Cursed Ground','Wizard Tower','Dungeon Entrance','Standing Stones'],
  'Historical':    ['Guard Post','Supply Depot','Watchtower','Bridge','Mill','Inn','Church','Market Square'],
  'Custom':        ['Point A','Point B','Point C','Point D','Point E','Point F','Point G','Point H'],
};

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function circlePos(count, cx, cy, r) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return { x: Math.round((cx + r * Math.cos(angle)) * 10) / 10, y: Math.round((cy + r * Math.sin(angle)) * 10) / 10 };
  });
}

function generateTerritories(setting, count, depth) {
  const names   = shuffled(SYSTEM_NAMES[setting] || SYSTEM_NAMES['Custom']).slice(0, count);
  const subPool = shuffled(SUB_TYPES[setting]    || SUB_TYPES['Custom']);
  const lmPool  = shuffled(LANDMARK_TYPES[setting] || LANDMARK_TYPES['Custom']);
  const topPos  = circlePos(count, 50, 50, 36);
  const result  = [];

  names.forEach((name, i) => {
    const topId = `top-${i}`;
    result.push({ _id: topId, _parentId: null, name, type: null, depth: 1, x_pos: topPos[i].x, y_pos: topPos[i].y });

    if (depth >= 2) {
      const subCount = 2 + (i % 2);
      const subPos   = circlePos(subCount, topPos[i].x, topPos[i].y, 10);
      for (let j = 0; j < subCount; j++) {
        const subId   = `sub-${i}-${j}`;
        const subType = subPool[(i * 3 + j) % subPool.length];
        result.push({ _id: subId, _parentId: topId, name: `${name.split(' ')[0]} ${subType}`, type: subType, depth: 2, x_pos: subPos[j].x, y_pos: subPos[j].y });

        if (depth >= 3) {
          const lmPos = circlePos(2, subPos[j].x, subPos[j].y, 4);
          for (let k = 0; k < 2; k++) {
            const lm = lmPool[(i * 6 + j * 2 + k) % lmPool.length];
            result.push({ _id: `lm-${i}-${j}-${k}`, _parentId: subId, name: lm, type: 'Landmark', depth: 3, x_pos: lmPos[k].x, y_pos: lmPos[k].y });
          }
        }
      }
    }
  });
  return result;
}

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-').slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 7);
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-dim)',
  color: 'var(--text-primary)', padding: '0.75rem 1rem', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.6rem',
  letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem',
};
function selBtn(active) {
  return {
    padding: '0.75rem', cursor: 'pointer',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border-dim)'}`,
    background: active ? 'rgba(183,140,64,0.1)' : 'rgba(255,255,255,0.02)',
    color: active ? 'var(--text-gold)' : 'var(--text-secondary)',
    fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
  };
}

const SETTINGS = ['Gothic Sci-Fi','Space Opera','High Fantasy','Historical','Custom'];
const SCALES   = ['Landmark','City','Planet','Star System','Star Sector','Galaxy'];
const FACTION_COLOURS = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#9b5de5'];

// ─── Main component ──────────────────────────────────────────────────────────

export default function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [form, setForm]     = useState({
    name: '', setting: 'Gothic Sci-Fi', description: '', visibility: 'Private',
    scale: 'Star System', territoryCount: 6, depth: 1,
    factions: [{ name: '', colour: '#e63946' }, { name: '', colour: '#457b9d' }],
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const setFaction = (i, field, value) => setForm(f => {
    const factions = [...f.factions];
    factions[i] = { ...factions[i], [field]: value };
    return { ...f, factions };
  });
  const addFaction = () => {
    if (form.factions.length >= 6) return;
    setForm(f => ({ ...f, factions: [...f.factions, { name: '', colour: FACTION_COLOURS[f.factions.length] || '#888' }] }));
  };
  const removeFaction = i => {
    if (form.factions.length <= 2) return;
    setForm(f => ({ ...f, factions: f.factions.filter((_, idx) => idx !== i) }));
  };

  function canProceed() {
    if (step === 1) return form.name.trim().length >= 2;
    if (step === 3) return form.factions.every(f => f.name.trim().length >= 1);
    return true;
  }

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const slug = generateSlug(form.name);

      // 1. Create campaign
      const { data: campaign, error: e1 } = await supabase.from('campaigns').insert({
        slug, name: form.name, setting: form.setting, description: form.description,
        visibility: form.visibility, organiser_id: user.id,
        map_scale: form.scale, map_territory_count: form.territoryCount, map_depth: form.depth,
      }).select().single();
      if (e1) throw e1;

      // 2. Add organiser as member
      const { error: e2 } = await supabase.from('campaign_members')
        .insert({ campaign_id: campaign.id, user_id: user.id, role: 'Organiser' });
      if (e2) throw e2;

      // 3. Create factions
      const { error: e3 } = await supabase.from('factions')
        .insert(form.factions.map(f => ({ campaign_id: campaign.id, name: f.name, colour: f.colour })));
      if (e3) throw e3;

      // 4. Generate & insert territories layer by layer
      const territories = generateTerritories(form.setting, form.territoryCount, form.depth);
      const idMap = {};

      for (const depthLevel of [1, 2, 3]) {
        if (depthLevel > form.depth) break;
        const batch = territories.filter(t => t.depth === depthLevel);
        if (!batch.length) continue;
        const { data: inserted, error: eT } = await supabase.from('territories')
          .insert(batch.map(t => ({
            campaign_id: campaign.id,
            parent_id: t._parentId ? idMap[t._parentId] : null,
            name: t.name, type: t.type, depth: t.depth, x_pos: t.x_pos, y_pos: t.y_pos,
          }))).select();
        if (eT) throw eT;
        batch.forEach((t, i) => { idMap[t._id] = inserted[i].id; });
      }

      router.push(`/c/${slug}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  // ─── Step 1: Basics ────────────────────────────────────────────────────────
  function Step1() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={labelStyle}>Campaign Name</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. The Vespator Crusade" style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-dim)'} />
        </div>
        <div>
          <label style={labelStyle}>Setting</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
            {SETTINGS.map(s => (
              <button key={s} type="button" onClick={() => set('setting', s)} style={selBtn(form.setting === s)}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Description <span style={{ opacity: 0.5 }}>(optional)</span></label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Describe your campaign's premise..." rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-dim)'} />
        </div>
        <div>
          <label style={labelStyle}>Visibility</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {['Private','Public'].map(v => (
              <button key={v} type="button" onClick={() => set('visibility', v)} style={{ ...selBtn(form.visibility === v), flex: 1 }}>{v}</button>
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
            {form.visibility === 'Private' ? 'Only invited players can see this campaign.' : 'Anyone can view this campaign without logging in.'}
          </p>
        </div>
      </div>
    );
  }

  // ─── Step 2: Map Generator ─────────────────────────────────────────────────
  function Step2() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={labelStyle}>Scale</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {SCALES.map(s => (
              <button key={s} type="button" onClick={() => set('scale', s)} style={selBtn(form.scale === s)}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>
            Number of Territories — <span style={{ color: 'var(--text-primary)' }}>{form.territoryCount}</span>
          </label>
          <input type="range" min={5} max={20} value={form.territoryCount}
            onChange={e => set('territoryCount', Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--gold)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            <span>5 — small</span><span>20 — large</span>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Map Depth</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { v: 1, label: 'Depth 1 · Top-level territories only',         ex: `${form.territoryCount} territories` },
              { v: 2, label: 'Depth 2 · Territories with sub-zones',          ex: `${form.territoryCount} territories, each with 2–3 sub-zones` },
              { v: 3, label: 'Depth 3 · Territories, sub-zones & landmarks',  ex: `${form.territoryCount} territories, sub-zones, and named landmarks` },
            ].map(d => (
              <button key={d.v} type="button" onClick={() => set('depth', d.v)}
                style={{ ...selBtn(form.depth === d.v), textAlign: 'left', padding: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{d.label}</div>
                <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{d.ex}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 3: Factions ──────────────────────────────────────────────────────
  function Step3() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          Add 2–6 factions. Players will be assigned to factions after the campaign is created.
        </p>
        {form.factions.map((faction, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Faction {i + 1}</label>
              <input type="text" value={faction.name} onChange={e => setFaction(i, 'name', e.target.value)}
                placeholder="e.g. Space Marines, Chaos, Aeldari" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-dim)'} />
            </div>
            <div>
              <label style={labelStyle}>Colour</label>
              <input type="color" value={faction.colour} onChange={e => setFaction(i, 'colour', e.target.value)}
                style={{ width: '48px', height: '44px', border: '1px solid var(--border-dim)', background: 'none', cursor: 'pointer', padding: '2px' }} />
            </div>
            {form.factions.length > 2 && (
              <button type="button" onClick={() => removeFaction(i)}
                style={{ background: 'none', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', padding: '0 0.75rem', cursor: 'pointer', height: '44px' }}>
                ✕
              </button>
            )}
          </div>
        ))}
        {form.factions.length < 6 && (
          <button type="button" onClick={addFaction}
            style={{ background: 'none', border: '1px dashed var(--border-dim)', color: 'var(--text-muted)', padding: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', width: '100%' }}>
            + Add Faction
          </button>
        )}
      </div>
    );
  }

  // ─── Step 4: Review ────────────────────────────────────────────────────────
  function Step4() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          Everything can be renamed and adjusted later from the Campaign Admin panel.
        </p>
        {[
          { label: 'Campaign Name', value: form.name },
          { label: 'Setting', value: form.setting },
          { label: 'Visibility', value: form.visibility },
          { label: 'Description', value: form.description || '—' },
          { label: 'Map Scale', value: `${form.scale} · ${form.territoryCount} territories · Depth ${form.depth}` },
          { label: 'Factions', value: form.factions.map(f => f.name || '(unnamed)').join(', ') },
        ].map(({ label, value }) => (
          <div key={label} style={{ borderBottom: '1px solid var(--border-dim)', paddingBottom: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.35rem' }}>{label}</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{value}</div>
          </div>
        ))}
        {/* Faction colour preview */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>Faction Colours</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {form.factions.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', background: f.colour, borderRadius: '2px' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{f.name || `Faction ${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
        {error && <p style={{ color: '#e87070', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center' }}>{error}</p>}
      </div>
    );
  }

  const stepLabels = ['Campaign Basics', 'Map Generator', 'Factions', 'Review & Create'];

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.75rem' }}>
            New Campaign Space
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '0.06em', marginBottom: '2rem' }}>
            {stepLabels[step - 1]}
          </h1>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            {stepLabels.map((_, i) => (
              <div key={i} style={{ height: '3px', width: i + 1 === step ? '28px' : '8px', background: i + 1 <= step ? 'var(--gold)' : 'var(--border-dim)', transition: 'all 0.3s' }} />
            ))}
          </div>
        </div>

        {step === 1 && Step1()}
        {step === 2 && Step2()}
        {step === 3 && Step3()}
        {step === 4 && Step4()}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', justifyContent: 'space-between' }}>
          {step > 1
            ? <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)} disabled={loading}>Back</button>
            : <div />
          }
          {step < 4
            ? <button type="button" className="btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>Continue</button>
            : <button type="button" className="btn-primary" onClick={handleCreate} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Creating campaign…' : 'Create Campaign'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
