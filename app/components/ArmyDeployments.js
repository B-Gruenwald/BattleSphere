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

function DeployModal({ armyId, memberCampaigns, deployedCampaignIds, onClose, onDeployed }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [deploying,          setDeploying]           = useState(false);
  const [error,              setError]               = useState('');

  const undeployed = memberCampaigns.filter(c => !deployedCampaignIds.includes(c.id));

  async function handleDeploy() {
    if (!selectedCampaignId) { setError('Please select a campaign.'); return; }
    setDeploying(true);
    setError('');
    try {
      const res = await fetch('/api/campaign-army-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: selectedCampaignId, army_id: armyId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to deploy.'); return; }
      onDeployed();
    } finally {
      setDeploying(false);
    }
  }

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
        width: '100%', maxWidth: '420px',
      }}>
        <h2 style={{ ...labelStyle, fontSize: '0.65rem', marginBottom: '1.25rem' }}>Deploy to Campaign</h2>

        {undeployed.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            This army is already deployed to all your campaigns.
          </p>
        ) : (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ ...mutedLabelStyle, display: 'block', marginBottom: '0.4rem' }}>Campaign</label>
            <select
              value={selectedCampaignId}
              onChange={e => setSelectedCampaignId(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Select a campaign —</option>
              {undeployed.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {memberCampaigns.filter(c => deployedCampaignIds.includes(c.id)).map(c => (
                <option key={c.id} value="" disabled>{c.name} — deployed ✓</option>
              ))}
            </select>
          </div>
        )}

        {error && <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary" style={{ fontSize: '0.8rem' }}>Cancel</button>
          {undeployed.length > 0 && (
            <button
              onClick={handleDeploy}
              disabled={!selectedCampaignId || deploying}
              className="btn-primary"
              style={{ fontSize: '0.8rem' }}
            >
              {deploying ? 'Deploying…' : 'Deploy'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ArmyDeployments({ armyId, deployments: initialDeployments, memberCampaigns, isOwner }) {
  const router = useRouter();
  const [deployments, setDeployments] = useState(initialDeployments);
  const [showModal,   setShowModal]   = useState(false);

  const deployedCampaignIds = deployments.map(d => d.campaign_id);

  function handleDeployed() {
    setShowModal(false);
    router.refresh();
  }

  return (
    <div style={{ border: '1px solid var(--border-dim)', padding: '1.25rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <h2 style={{ ...labelStyle }}>Campaigns</h2>
        {isOwner && memberCampaigns.length > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-secondary"
            style={{ fontSize: '0.72rem', padding: '0.3rem 0.9rem' }}
          >
            + Deploy to Campaign
          </button>
        )}
      </div>

      {deployments.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          {isOwner
            ? 'Not yet deployed to any campaign. Use the button above to deploy.'
            : 'Not deployed to any campaigns.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {deployments.map(d => (
            <div key={d.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 0.9rem',
              border: '1px solid var(--border-dim)',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {d.campaign?.name ?? 'Unknown Campaign'}
              </span>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Link
                  href={`/c/${d.campaign?.slug}/forces/${armyId}`}
                  style={{ color: 'var(--text-gold)', fontSize: '0.75rem', textDecoration: 'none' }}
                >
                  Manage Roster →
                </Link>
                <Link
                  href={`/c/${d.campaign?.slug}`}
                  style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textDecoration: 'none' }}
                >
                  Campaign ↗
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <DeployModal
          armyId={armyId}
          memberCampaigns={memberCampaigns}
          deployedCampaignIds={deployedCampaignIds}
          onClose={() => setShowModal(false)}
          onDeployed={handleDeployed}
        />
      )}
    </div>
  );
}
