'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [done,      setDone]      = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            opacity: 0.5,
          }}>
            <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
            <div style={{ width: '5px', height: '5px', background: 'var(--gold)', transform: 'rotate(45deg)' }} />
            <div style={{ width: '40px', height: '1px', background: 'var(--gold)' }} />
          </div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.65rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: 'var(--text-gold)',
            marginBottom: '0.75rem',
          }}>
            Account Recovery
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '0.06em' }}>
            New Password
          </h1>
        </div>

        {done ? (
          <div style={{
            border: '1px solid var(--gold)',
            padding: '2rem',
            textAlign: 'center',
            background: 'rgba(183, 140, 64, 0.05)',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>✦</div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.7rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '0.75rem',
            }}>
              Password updated
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontStyle: 'italic', lineHeight: 1.6 }}>
              Redirecting you to the dashboard…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontStyle: 'italic', lineHeight: 1.6, textAlign: 'center' }}>
              Choose a new password for your account.
            </p>

            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: '0.6rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--text-gold)',
                marginBottom: '0.5rem',
              }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: '0.6rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--text-gold)',
                marginBottom: '0.5rem',
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Repeat your new password"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
              />
            </div>

            {error && (
              <p style={{ color: '#e87070', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', opacity: loading ? 0.6 : 1, marginTop: '0.5rem' }}
            >
              {loading ? 'Updating…' : 'Set New Password'}
            </button>

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              <Link href="/login" style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
