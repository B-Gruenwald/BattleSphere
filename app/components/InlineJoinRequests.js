'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function InlineJoinRequests({ campaignId, campaignSlug, campaignName, initialRequests }) {
  const supabase = createClient();
  const [requests, setRequests] = useState(initialRequests || []);
  const [acting,   setActing]   = useState({});
  const [error,    setError]    = useState('');

  async function approve(req) {
    setActing(prev => ({ ...prev, [req.id]: 'approving' }));
    setError('');

    const { error: insertError } = await supabase
      .from('campaign_members')
      .insert({ campaign_id: campaignId, user_id: req.user_id, role: 'player' });

    if (insertError) {
      setError('Could not approve: ' + insertError.message);
      setActing(prev => ({ ...prev, [req.id]: null }));
      return;
    }

    await supabase
      .from('join_requests')
      .update({ status: 'approved' })
      .eq('id', req.id);

    // Fire-and-forget notification
    fetch('/api/notifications/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: req.user_id,
        type:  'campaign_joined',
        title: `Your request to join ${campaignName} has been approved!`,
        body:  'Head to the campaign to choose your faction and start playing.',
        link:  `/c/${campaignSlug}`,
      }),
    }).catch(() => {});

    setRequests(prev => prev.filter(r => r.id !== req.id));
    setActing(prev => ({ ...prev, [req.id]: null }));
  }

  async function decline(req) {
    setActing(prev => ({ ...prev, [req.id]: 'declining' }));
    setError('');

    await supabase
      .from('join_requests')
      .update({ status: 'declined' })
      .eq('id', req.id);

    setRequests(prev => prev.filter(r => r.id !== req.id));
    setActing(prev => ({ ...prev, [req.id]: null }));
  }

  if (requests.length === 0) return null;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{
        borderBottom: '1px solid var(--border-dim)',
        paddingBottom: '0.75rem',
        marginBottom: '1rem',
        display: 'flex', alignItems: 'baseline', gap: '0.75rem',
      }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '0.52rem',
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--text-gold)', margin: 0,
        }}>
          Join Requests
        </p>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '0.48rem',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--text-gold)', border: '1px solid rgba(183,140,64,0.4)',
          padding: '0.1rem 0.4rem',
        }}>
          {requests.length} pending
        </span>
      </div>

      {error && <p style={{ color: '#e05a5a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {requests.map(req => {
          const username = req.profiles?.username || 'Unknown';
          const isActing = acting[req.id];

          return (
            <div key={req.id} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0.75rem 0', borderBottom: '1px solid var(--border-dim)',
              flexWrap: 'wrap',
            }}>
              <span style={{ flex: 1, minWidth: '6rem', fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                {username}
              </span>
              {req.message && (
                <span style={{
                  fontSize: '0.82rem', color: 'var(--text-muted)',
                  fontStyle: 'italic', flex: 2, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  "{req.message}"
                </span>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  onClick={() => approve(req)}
                  disabled={!!isActing}
                  className="btn-primary"
                  style={{ padding: '0.25rem 0.8rem', fontSize: '0.75rem', opacity: isActing === 'approving' ? 0.6 : 1 }}
                >
                  {isActing === 'approving' ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => decline(req)}
                  disabled={!!isActing}
                  style={{
                    background: 'none', border: '1px solid var(--border-dim)',
                    color: 'var(--text-muted)', cursor: isActing ? 'not-allowed' : 'pointer',
                    padding: '0.25rem 0.8rem', fontSize: '0.75rem',
                    opacity: isActing === 'declining' ? 0.6 : 1,
                  }}
                >
                  {isActing === 'declining' ? '…' : 'Decline'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
