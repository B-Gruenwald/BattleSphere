'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

function generateCode(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AdminPlayerSearch({ members: initialMembers, campaignId, organiserId, inviteCode: initialCode, slug }) {
  const supabase = createClient();

  const [members,     setMembers]     = useState(initialMembers || []);
  const [inviteCode,  setInviteCode]  = useState(initialCode);

  // Search state
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [searchError, setSearchError] = useState('');

  // Adding state
  const [adding,      setAdding]      = useState({}); // keyed by user_id
  const [addError,    setAddError]    = useState('');

  // Remove state
  const [removing,    setRemoving]    = useState({}); // keyed by user_id
  const [confirmRemove, setConfirmRemove] = useState(null);

  // Invite code state
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied,          setCopied]         = useState(false);
  const [inviteError,     setInviteError]    = useState('');
  const linkRef = useRef(null);

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
    // Filter out already-members
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
      // Add to local member list
      setMembers(prev => [...prev, { user_id: profile.id, role: 'player', faction_id: null, profile }]);
      // Remove from search results
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
      // Show inline error on the member row
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, _removeError: error.message } : m));
    } else {
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      setConfirmRemove(null);
    }
  }

  // ── Invite link ────────────────────────────────────────────────────────────
  const inviteUrl = inviteCode
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://battle-sphere-topaz.vercel.app'}/join/${inviteCode}`
    : null;

  async function generateInviteLink() {
    setGeneratingCode(true);
    setInviteError('');
    const code = generateCode(10);
    const { data: saved, error } = await supabase
      .from('campaigns')
      .update({ invite_code: code })
      .eq('id', campaignId)
      .select();
    setGeneratingCode(false);
    if (error) {
      setInviteError('Could not save invite code: ' + error.message);
      return;
    }
    if (!saved || saved.length === 0) {
      setInviteError('Update was blocked — make sure the invite_code migration has been run in Supabase.');
      return;
    }
    setInviteCode(code);
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback — select text
      if (linkRef.current) {
        linkRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── Current members ─────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
        <p style={{ ...labelStyle, marginBottom: '1.25rem', color: 'var(--text-gold)' }}>
          Current Members ({members.length})
        </p>

        {members.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
            No players yet. Add some below or share the invite link.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '0.5rem', padding: '0.4rem 0.75rem', borderBottom: '1px solid var(--border-dim)', marginBottom: '0.25rem' }}>
              {['Player', 'Role', ''].map((h, i) => (
                <span key={i} style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</span>
              ))}
            </div>

            {members.map(m => {
              const username = m.profile?.username || 'Unknown';
              const isOrganiser = m.user_id === organiserId;
              const isConfirm = confirmRemove === m.user_id;
              const isRemoving = removing[m.user_id];

              return (
                <div key={m.user_id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '0.5rem', padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                  {/* Name */}
                  <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {username}
                    {isOrganiser && (
                      <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '0.48rem', letterSpacing: '0.1em', color: 'var(--text-gold)' }}>YOU</span>
                    )}
                  </span>

                  {/* Role */}
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: roleColour[m.role] || 'var(--text-muted)' }}>
                    {m.role}
                  </span>

                  {/* Remove */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {m._removeError && (
                      <span style={{ color: '#e05a5a', fontSize: '0.75rem' }}>{m._removeError}</span>
                    )}
                    {!isOrganiser && (
                      isConfirm ? (
                        <>
                          <span style={{ fontSize: '0.78rem', color: '#e05a5a' }}>Remove?</span>
                          <button
                            type="button"
                            onClick={() => removePlayer(m.user_id)}
                            disabled={isRemoving}
                            style={{ background: 'rgba(224,90,90,0.15)', border: '1px solid #e05a5a', color: '#e05a5a', padding: '0.2rem 0.55rem', fontSize: '0.72rem', cursor: 'pointer', opacity: isRemoving ? 0.6 : 1 }}
                          >
                            {isRemoving ? '…' : 'Yes'}
                          </button>
                          <button type="button" onClick={() => setConfirmRemove(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRemove(m.user_id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', padding: '0.2rem 0.4rem' }}
                        >
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
          {searching && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', alignSelf: 'center', whiteSpace: 'nowrap' }}>Searching…</span>
          )}
        </div>

        {searchError && (
          <p style={{ color: '#e05a5a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{searchError}</p>
        )}

        {/* Search results */}
        {results.length > 0 && (
          <div style={{ border: '1px solid var(--border-dim)', marginBottom: '0.75rem' }}>
            {results.map(profile => (
              <div key={profile.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{profile.username}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => addPlayer(profile)}
                  disabled={!!adding[profile.id]}
                  style={{ padding: '0.25rem 0.8rem', fontSize: '0.75rem', opacity: adding[profile.id] ? 0.6 : 1 }}
                >
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

        {addError && (
          <p style={{ color: '#e05a5a', fontSize: '0.82rem', marginTop: '0.5rem' }}>{addError}</p>
        )}
      </div>

      {/* ── Invite Link ──────────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--border-dim)', padding: '1.75rem' }}>
        <p style={{ ...labelStyle, marginBottom: '0.5rem', color: 'var(--text-gold)' }}>
          Shareable Invite Link
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Anyone with this link can join your campaign after registering. Regenerating the link invalidates the previous one.
        </p>

        {inviteError && (
          <p style={{ color: '#e05a5a', fontSize: '0.85rem', marginBottom: '1rem' }}>{inviteError}</p>
        )}

        {inviteCode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Link display */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                ref={linkRef}
                readOnly
                value={inviteUrl || ''}
                style={{ ...inputStyle, color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'text', flex: '1', minWidth: '200px' }}
                onFocus={e => e.target.select()}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={copyLink}
                style={{ whiteSpace: 'nowrap', padding: '0.6rem 1.2rem' }}
              >
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
            {/* Regenerate */}
            <div>
              <button
                type="button"
                onClick={generateInviteLink}
                disabled={generatingCode}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', padding: 0, opacity: generatingCode ? 0.6 : 1 }}
              >
                {generatingCode ? 'Generating…' : 'Regenerate link (invalidates old one)'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={generateInviteLink}
            disabled={generatingCode}
            style={{ opacity: generatingCode ? 0.6 : 1 }}
          >
            {generatingCode ? 'Generating…' : 'Generate Invite Link'}
          </button>
        )}
      </div>
    </div>
  );
}
