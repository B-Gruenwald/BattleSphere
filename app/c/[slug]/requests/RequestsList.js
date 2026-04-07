'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function RequestsList({ initialRequests, campaignId, campaignSlug }) {
  const [requests, setRequests] = useState(initialRequests || []);
  const [loading, setLoading]   = useState(null); // id of the request being acted on
  const [error, setError]       = useState(null);

  const pending  = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  async function handleApprove(req) {
    setLoading(req.id);
    setError(null);
    const supabase = createClient();

    // Add as campaign member
    const { error: memberErr } = await supabase
      .from('campaign_members')
      .insert({ campaign_id: campaignId, user_id: req.user_id, role: 'member' });

    if (memberErr) {
      // If already a member (duplicate), still mark request approved
      if (!memberErr.message?.includes('duplicate') && !memberErr.code === '23505') {
        setError(`Could not add ${req.profile?.display_name || 'player'} as a member: ${memberErr.message}`);
        setLoading(null);
        return;
      }
    }

    // Add a chronicle entry so the join appears in the campaign timeline
    const playerName = req.profile?.display_name || req.profile?.username || 'A new player';
    await supabase.from('campaign_events').insert({
      campaign_id: campaignId,
      title:       `${playerName} joined the Campaign`,
      body:        null,
      event_type:  'narrative',
      status:      'resolved',
    });

    // Mark request approved
    const { error: updateErr } = await supabase
      .from('join_requests')
      .update({ status: 'approved' })
      .eq('id', req.id)
      .select();

    if (updateErr) {
      setError(`Could not update request status: ${updateErr.message}`);
      setLoading(null);
      return;
    }

    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
    setLoading(null);
  }

  async function handleReject(req) {
    setLoading(req.id);
    setError(null);
    const supabase = createClient();

    const { error: updateErr } = await supabase
      .from('join_requests')
      .update({ status: 'rejected' })
      .eq('id', req.id)
      .select();

    if (updateErr) {
      setError(`Could not reject request: ${updateErr.message}`);
      setLoading(null);
      return;
    }

    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
    setLoading(null);
  }

  if (requests.length === 0) {
    return (
      <div style={{
        border: '1px solid var(--border-dim)', padding: '4rem 2rem', textAlign: 'center',
      }}>
        <div style={{
          width: '8px', height: '8px', background: 'var(--text-gold)',
          transform: 'rotate(45deg)', margin: '0 auto 1.5rem', opacity: 0.3,
        }} />
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No join requests yet. Share the public campaign link to attract players.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          Public URL: <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            /campaign/{campaignSlug}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{
          background: 'rgba(224,90,90,0.08)', border: '1px solid rgba(224,90,90,0.3)',
          padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#e05a5a', fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.58rem',
              letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-gold)',
            }}>
              Pending — {pending.length} {pending.length === 1 ? 'request' : 'requests'}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pending.map(req => (
              <div key={req.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                padding: '1.25rem 1.5rem',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-dim)',
                borderLeft: '3px solid rgba(183,140,64,0.4)',
              }}>
                {/* Avatar placeholder */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'rgba(183,140,64,0.15)',
                  border: '1px solid rgba(183,140,64,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--text-gold)',
                }}>
                  {(req.profile?.display_name || req.profile?.username || '?').charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {req.profile?.display_name || req.profile?.username || 'Unknown player'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                    Requested {formatDate(req.created_at)}
                  </div>
                  {req.message && (
                    <p style={{
                      color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic',
                      marginTop: '0.4rem', lineHeight: 1.5,
                    }}>
                      "{req.message}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    className="btn-primary"
                    style={{
                      fontSize: '0.6rem', padding: '0.4rem 1rem',
                      opacity: loading === req.id ? 0.6 : 1,
                      cursor: loading === req.id ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => handleApprove(req)}
                    disabled={loading === req.id}
                  >
                    {loading === req.id ? '…' : 'Approve'}
                  </button>
                  <button
                    className="btn-secondary"
                    style={{
                      fontSize: '0.6rem', padding: '0.4rem 1rem',
                      opacity: loading === req.id ? 0.6 : 1,
                      cursor: loading === req.id ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => handleReject(req)}
                    disabled={loading === req.id}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved requests */}
      {resolved.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.55rem',
              letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)',
            }}>
              Resolved
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {resolved.map(req => {
              const isApproved = req.status === 'approved';
              return (
                <div key={req.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                  padding: '1rem 1.5rem',
                  background: 'transparent',
                  border: '1px solid var(--border-dim)',
                  borderLeft: `3px solid ${isApproved ? 'rgba(80,180,120,0.5)' : 'rgba(224,90,90,0.35)'}`,
                  opacity: 0.7,
                }}>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      {req.profile?.display_name || req.profile?.username || 'Unknown player'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.1rem' }}>
                      {formatDate(req.created_at)}
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '0.52rem',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: isApproved ? '#50b478' : '#e05a5a',
                    border: `1px solid ${isApproved ? 'rgba(80,180,120,0.3)' : 'rgba(224,90,90,0.3)'}`,
                    padding: '0.2rem 0.5rem',
                  }}>
                    {isApproved ? 'Approved' : 'Declined'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
