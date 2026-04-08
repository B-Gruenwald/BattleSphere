'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const APP_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://battle-sphere-topaz.vercel.app';

function generateCode(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function formatExpiry(expiresAt) {
  const d     = new Date(expiresAt);
  const now   = new Date();
  const diff  = d - now;
  if (diff < 0) return 'Expired';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

function isExpired(expiresAt) {
  return new Date(expiresAt) < new Date();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminPlayerSearch({ members: initialMembers, campaignId, organiserId, initialInviteCodes, slug }) {
  const supabase = createClient();

  const [members,     setMembers]     = useState(initialMembers || []);
  const [inviteCodes, setInviteCodes] = useState(initialInviteCodes || []);

  // Search state
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [searchError, setSearchError] = useState('');

  // Adding state
  const [adding,      setAdding]      = useState({});
  const [addError,    setAddError]    = useState('');

  // Remove state
  const [removing,    setRemoving]    = useState({});
  const [confirmRemove, setConfirmRemove] = useState(null);

  // Invite code state
  const [generatingCode, setGeneratingCode] = useState(false);
  const [inviteError,    setInviteError]    = useState('');
  const [revoking,       setRevoking]       = useState({});
  const [copied,         setCopied]         = useState(null); // code id that was just copied

  const existingIds = new Set(members.map(m => m.user_id));

  // ── Search ─────────────────────────────────────────────────────────────────
  async function search(q) {
    setQuery(q);
    setAddError('');
    if (!q.trim() || q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    setSearchError('');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${q.trim()}%`)
      .limit(8);
    setSearching(false);
    if (error) { setSearchError('Search failed: ' + error.message); return; }
    setResults((data || []).filter(p => !existingIds.has(p.id)));
  }

  // ── Add player ─────────────────────────────────────────────────────────────
  async function addPlayer(profile) {
    setAdding(prev => ({ ...prev, [profile.id]: true }));
    setAddError('');
    const { error } = await supabase
      .from('campaign_members')
      .insert({ campaign_id: campaignId, user_id: profile.id, role: 'player' });
    setAdding(prev => ({ ...prev, [profile.id]: false }));
    if (error) {
      setAddError('Could not add player: ' + error.message);
    } else {
      setMembers(prev => [...prev, { user_id: profile.id, role: 'player', faction_id: null, profile }]);
      setResults(prev => prev.filter(p => p.id !== profile.id));
      setQuery('');
    }
  }

  // ── Remove player ──────────────────────────────────────────────────────────
  async function removePlayer(userId) {
    setRemoving(prev => ({ ...prev, [userId]: true }));
    const { error } = await supabase
      .from('campaign_members')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('user_id', userId);
    setRemoving(prev => ({ ...prev, [userId]: false }));
    if (error) {
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, _removeError: error.message } : m));
    } else {
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      setConfirmRemove(null);
    }
  }

  // ── Generate invite link ───────────────────────────────────────────────────
  async function generateInviteLink() {
    setGeneratingCode(true);
    setInviteError('');
    const code = generateCode(10);
    const { data: saved, error } = await supabase
      .from('campaign_invite_codes')
      .insert({ campaign_id: campaignId, code })
      .select()
      .single();
    setGeneratingCode(false);
    if (error) {
      setInviteError('Could not create invite link: ' + error.message);
      return;
    }
    setInviteCodes(prev => [saved, ...prev]);
  }

  // ── Revoke invite link ─────────────────────────────────────────────────────
  async function revokeCode(codeId) {
    setRevoking(prev => ({ ...prev, [codeId]: true }));
    const { error } = await supabase
      .from('campaign_invite_codes')
      .delete()
      .eq('id', codeId);
    setRevoking(prev => ({ ...prev, [codeId]: false }));
    if (error) {
      setInviteError('Could not revoke link: ' + error.message);
    } else {
      setInviteCodes(prev => prev.filter(c => c.id !== codeId));
    }
  }

  // ── Copy link to clipboard ─────────────────────────────────────────────────
  async function copyLink(codeObj) {
    const url = `${APP_URL}/join/${codeObj.code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(codeObj.id);
    setTimeout(() => setCopied(null), 2500);
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.6rem 0.9rem',
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
    flex: 1,
  };

  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontSize: '0.52rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '0.4rem',
  };

  const roleColour = { organiser: 'var(--text-gold)', admin: '#6a8fc7', player: 'var(--text-muted)' };

  const activeLinks = inviteCodes.filter(c => !isExpired(c.expires_at));
  const expiredLinks = inviteCodes.filter(c => isExpired(c.expires_at));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── Current members ─────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
        <p style={{ ...labelStyle, marginBottom: '1.25rem', color: 'var(--text-gold)' }}>
          Current Members ({members.length})
        </p>

        {members.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
            No players yet. Add some below or share an invite link.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '0.5rem', padding: '0.4rem 0.75rem', borderBottom: '1px solid var(--border-dim)', marginBottom: '0.25rem' }}>
              {['Player', 'Role', ''].map((h, i) => (
                <span key={i} style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</span>
              ))}
            </div>

            {members.map(m => {
              const username    = m.profile?.username || 'Unknown';
              const isOrganiser = m.user_id === organiserId;
              const isConfirm   = confirmRemove === m.user_id;
              const isRemoving  = removing[m.user_id];

              return (
                <div key={m.user_id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '0.5rem', padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {username}
                    {isOrganiser && (
                      <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.1em', color: 'var(--text-gold)' }}>YOU</span>
                    )}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: roleColour[m.role] || 'var(--text-muted)' }}>
                    {m.role}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {m._removeError && <span style={{ color: '#e05a5a', fontSize: '0.75rem' }}>{m._removeError}</span>}
                    {!isOrganiser && (
                      isConfirm ? (
                        <>
                          <span style={{ fontSize: '0.78rem', color: '#e05a5a' }}>Remove?</span>
                          <button type="button" onClick={() => removePlayer(m.user_id)} disabled={isRemoving} style={{ background: 'rgba(224,90,90,0.15)', border: '1px solid #e05a5a', color: '#e05a5a', padding: '0.2rem 0.55rem', fontSize: '0.72rem', cursor: 'pointer', opacity: isRemoving ? 0.6 : 1 }}>
                            {isRemoving ? '…' : 'Yes'}
                          </button>
                          <button type="button" onClick={() => setConfirmRemove(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmRemove(m.user_id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', padding: '0.2rem 0.4rem' }}>
                          Remove
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add player by username ───────────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
        <p style={{ ...labelStyle, marginBottom: '1rem', color: 'var(--text-gold)' }}>
          Add Player by Username
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            value={query}
            onChange={e => search(e.target.value)}
            placeholder="Search by username…"
            style={inputStyle}
          />
          {searching && <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', alignSelf: 'center', whiteSpace: 'nowrap' }}>Searching…</span>}
        </div>

        {searchError && <p style={{ color: '#e05a5a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{searchError}</p>}

        {results.length > 0 && (
          <div style={{ border: '1px solid var(--border-dim)', marginBottom: '0.75rem' }}>
            {results.map(profile => (
              <div key={profile.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{profile.username}</span>
                <button type="button" className="btn-secondary" onClick={() => addPlayer(profile)} disabled={!!adding[profile.id]} style={{ padding: '0.25rem 0.8rem', fontSize: '0.75rem', opacity: adding[profile.id] ? 0.6 : 1 }}>
                  {adding[profile.id] ? 'Adding…' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}

        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            No registered users found matching "{query}". They may need to register first.
          </p>
        )}

        {addError && <p style={{ color: '#e05a5a', fontSize: '0.82rem', marginTop: '0.5rem' }}>{addError}</p>}
      </div>

      {/* ── Invite Links ─────────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
        <p style={{ ...labelStyle, marginBottom: '0.5rem', color: 'var(--text-gold)' }}>
          Shareable Invite Links
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Each link is valid for 7 days. You can create as many as you like — they expire independently and you can revoke any one without affecting the others.
        </p>

        {inviteError && <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '1rem' }}>{inviteError}</p>}

        {/* Generate button */}
        <button
          type="button"
          className="btn-primary"
          onClick={generateInviteLink}
          disabled={generatingCode}
          style={{ opacity: generatingCode ? 0.6 : 1, marginBottom: inviteCodes.length > 0 ? '1.5rem' : 0 }}
        >
          {generatingCode ? 'Creating…' : '+ Generate New Invite Link'}
        </button>

        {/* Active links */}
        {activeLinks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: expiredLinks.length > 0 ? '1.25rem' : 0 }}>
            {activeLinks.map(codeObj => {
              const url        = `${APP_URL}/join/${codeObj.code}`;
              const isCopied   = copied === codeObj.id;
              const isRevoking = revoking[codeObj.id];

              return (
                <div key={codeObj.id} style={{ background: 'rgba(183,140,64,0.04)', border: '1px solid rgba(183,140,64,0.18)', padding: '0.85rem 1rem' }}>
                  {/* Expiry + Revoke row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-gold)' }}>
                      {formatExpiry(codeObj.expires_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => revokeCode(codeObj.id)}
                      disabled={isRevoking}
                      style={{ background: 'none', border: 'none', color: '#e05a5a', cursor: isRevoking ? 'not-allowed' : 'pointer', fontSize: '0.75rem', opacity: isRevoking ? 0.6 : 1, padding: 0 }}
                    >
                      {isRevoking ? 'Revoking…' : 'Revoke'}
                    </button>
                  </div>

                  {/* Link + Copy row */}
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <input
                      readOnly
                      value={url}
                      style={{ ...inputStyle, flex: 1, color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'text', padding: '0.45rem 0.75rem', minWidth: 0 }}
                      onFocus={e => e.target.select()}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => copyLink(codeObj)}
                      style={{ whiteSpace: 'nowrap', padding: '0.45rem 1rem', fontSize: '0.8rem', flexShrink: 0 }}
                    >
                      {isCopied ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expired links (collapsed list) */}
        {expiredLinks.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
              Expired ({expiredLinks.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {expiredLinks.map(codeObj => (
                <div key={codeObj.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)', opacity: 0.6 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    …{codeObj.code.slice(-6)}
                  </span>
                  <button
                    type="button"
                    onClick={() => revokeCode(codeObj.id)}
                    disabled={revoking[codeObj.id]}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, opacity: revoking[codeObj.id] ? 0.6 : 1 }}
                  >
                    {revoking[codeObj.id] ? '…' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {inviteCodes.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', marginTop: '1rem' }}>
            No invite links yet. Create one above and share it with your players.
          </p>
        )}
      </div>
    </div>
  );
}
