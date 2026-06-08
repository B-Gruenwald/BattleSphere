'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const labelStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.6rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-gold)',
};

const mutedLabelStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.5rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

const inputStyle = {
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-dim)',
  color: 'var(--text-primary)',
  padding: '0.5rem 0.75rem',
  fontSize: '1rem',
  width: '100%',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

// Single army card in the list
function ArmyForceCard({ record, campaignSlug, onDeploy }) {
  const army    = record.army;
  const faction = record.faction;
  const gameSystem = army?.game_system ?? '';

  const gameIcon = gameSystem.toLowerCase().includes('kill team') ? '⚡'
    : gameSystem.toLowerCase().includes('40') ? '☩'
    : gameSystem.toLowerCase().includes('sigmar') ? '⚔'
    : '◆';

  return (
    <div style={{
      border: '1px solid var(--border-dim)',
      padding: '1.25rem',
      display: 'flex',
      gap: '1rem',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      background: 'rgba(255,255,255,0.015)',
    }}>
      {/* Thumbnail */}
      <div style={{
        width: '72px',
        height: '72px',
        flexShrink: 0,
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-dim)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {army?.cover_image_url
          ? <img src={army.cover_image_url} alt={army.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: 'var(--border-dim)', fontSize: '1.4rem' }}>{gameIcon}</span>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: '160px' }}>
        <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
          {army?.name ?? 'Unknown Army'}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {gameSystem && (
            <span style={{ ...labelStyle, fontSize: '0.48rem', border: '1px solid var(--gold)', padding: '0.15rem 0.5rem' }}>
              {gameSystem}
            </span>
          )}
          {army?.faction_name && (
            <span style={{ ...mutedLabelStyle, fontSize: '0.48rem' }}>{army.faction_name}</span>
          )}
          {faction && (
            <span style={{
              ...mutedLabelStyle,
              fontSize: '0.48rem',
              color: faction.colour ?? 'var(--text-muted)',
            }}>
              ● {faction.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span>{record.battles_played ?? 0} battles played</span>
          <span>{record.battles_won ?? 0} won</span>
        </div>
      </div>

      {/* Action */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: '72px' }}>
        <Link
          href={`/c/${campaignSlug}/forces/${army?.id}`}
          style={{ textDecoration: 'none' }}
        >
          <button className="btn-primary" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
            Manage Roster →
          </button>
        </Link>
        <Link
          href={`/armies/${army?.id}`}
          style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textDecoration: 'none' }}
        >
          View Army Portfolio ↗
        </Link>
      </div>
    </div>
  );
}

// Deploy modal
function DeployModal({ allPlayerArmies, deployedArmyIds, factions, campaignId, onClose, onDeployed }) {
  const router = useRouter();
  const [selectedArmyId,    setSelectedArmyId]    = useState('');
  const [selectedFactionId, setSelectedFactionId] = useState('');
  const [deploying,         setDeploying]         = useState(false);
  const [error,             setError]             = useState('');

  async function handleDeploy() {
    if (!selectedArmyId) { setError('Please select an army.'); return; }
    setDeploying(true);
    setError('');
    try {
      const res = await fetch('/api/campaign-army-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, army_id: selectedArmyId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to deploy army.'); return; }

      // If a faction was selected, update the record with it
      if (selectedFactionId && json.record?.id) {
        await fetch(`/api/campaign-army-records/${json.record.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ faction_id: selectedFactionId }),
        });
      }

      const army    = allPlayerArmies.find(a => a.id === selectedArmyId) ?? null;
      const faction = factions.find(f => f.id === selectedFactionId) ?? null;
      onDeployed({
        id:            json.record.id,
        army_id:       selectedArmyId,
        campaign_id:   campaignId,
        faction_id:    selectedFactionId || null,
        battles_played: 0,
        battles_won:    0,
        army,
        faction,
      });
    } finally {
      setDeploying(false);
    }
  }

  const undeployed = allPlayerArmies.filter(a => !deployedArmyIds.includes(a.id));

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-dim)',
        padding: '1.75rem',
        width: '100%', maxWidth: '480px',
      }}>
        <h2 style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '1.25rem' }}>Deploy an Army</h2>

        {undeployed.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            All your armies are already deployed to this campaign.{' '}
            <Link href="/armies/new" style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>Create a new army →</Link>
          </p>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ ...mutedLabelStyle, display: 'block', marginBottom: '0.4rem' }}>Army</label>
              <select
                value={selectedArmyId}
                onChange={e => setSelectedArmyId(e.target.value)}
                style={inputStyle}
              >
                <option value="">— Select an army —</option>
                {undeployed.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.game_system ? ` · ${a.game_system}` : ''}{a.faction_name ? ` · ${a.faction_name}` : ''}
                  </option>
                ))}
                {allPlayerArmies.filter(a => deployedArmyIds.includes(a.id)).map(a => (
                  <option key={a.id} value="" disabled>
                    {a.name} — already deployed ✓
                  </option>
                ))}
              </select>
            </div>

            {factions.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ ...mutedLabelStyle, display: 'block', marginBottom: '0.4rem' }}>
                  Fighting for faction <span style={{ fontFamily: 'inherit', textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <select
                  value={selectedFactionId}
                  onChange={e => setSelectedFactionId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— None / unaligned —</option>
                  {factions.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {error && <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary" style={{ fontSize: '0.8rem' }}>Cancel</button>
          {undeployed.length > 0 && (
            <button onClick={handleDeploy} disabled={!selectedArmyId || deploying} className="btn-primary" style={{ fontSize: '0.8rem' }}>
              {deploying ? 'Deploying…' : 'Deploy Army'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForcesClient({ campaign, records: initialRecords, allPlayerArmies, factions, userId }) {
  const router = useRouter();
  const [records,        setRecords]        = useState(initialRecords);
  const [showDeploy,     setShowDeploy]     = useState(false);

  const deployedArmyIds = records.map(r => r.army_id);

  function handleDeployed(newRecord) {
    setRecords(prev => [...prev, newRecord]);
    setShowDeploy(false);
    router.refresh();
  }

  return (
    <>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ ...labelStyle, fontSize: '0.55rem', marginBottom: '0.3rem' }}>
            <Link href={`/c/${campaign.slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              {campaign.name}
            </Link>
            {' '}›
          </div>
          <h1 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.6rem)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            My Forces
          </h1>
        </div>
        <button
          onClick={() => setShowDeploy(true)}
          className="btn-primary"
          style={{ fontSize: '0.82rem' }}
        >
          + Deploy an Army
        </button>
      </div>

      {/* Army cards */}
      {records.length === 0 ? (
        <div style={{ border: '1px solid var(--border-dim)', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            No forces deployed to this campaign yet.
          </p>
          {allPlayerArmies.length === 0 ? (
            <Link href="/armies/new" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ fontSize: '0.82rem' }}>Create your first army →</button>
            </Link>
          ) : (
            <button onClick={() => setShowDeploy(true)} className="btn-primary" style={{ fontSize: '0.82rem' }}>
              Deploy your first army →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {records.map(record => (
            <ArmyForceCard
              key={record.id}
              record={record}
              campaignSlug={campaign.slug}
              onDeploy={() => setShowDeploy(true)}
            />
          ))}
        </div>
      )}

      {/* Deploy modal */}
      {showDeploy && (
        <DeployModal
          allPlayerArmies={allPlayerArmies}
          deployedArmyIds={deployedArmyIds}
          factions={factions}
          campaignId={campaign.id}
          onClose={() => setShowDeploy(false)}
          onDeployed={handleDeployed}
        />
      )}
    </>
  );
}
