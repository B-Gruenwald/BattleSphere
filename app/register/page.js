'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || null;

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    padding: '0.75rem 1rem',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontSize: '0.6rem',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--text-gold)',
    marginBottom: '0.5rem',
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
            Join BattleSphere
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '0.06em' }}>
            Create Account
          </h1>
        </div>

        {/* Invite banner */}
        {redirectTo && redirectTo.startsWith('/join/') && !success && (
          <div style={{
            border: '1px solid rgba(183,140,64,0.4)',
            background: 'rgba(183,140,64,0.06)',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--text-gold)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              You've been invited to a campaign. Create an account to join.
            </p>
          </div>
        )}

        {success ? (
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
              Check your email
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontStyle: 'italic', lineHeight: 1.6 }}>
              We&apos;ve sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
              Click the link to activate your account
              {redirectTo && redirectTo.startsWith('/join/') ? ', then return to the invite link to join the campaign.' : '.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Username */}
            <div>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                placeholder="e.g. IronhandGrünwald"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
              />
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Minimum 6 characters"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
              />
            </div>

            {/* Error */}
            {error && (
              <p style={{
                color: '#e87070',
                fontSize: '0.85rem',
                fontStyle: 'italic',
                textAlign: 'center',
              }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', opacity: loading ? 0.6 : 1, marginTop: '0.5rem' }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            {/* Link to login — preserves redirect param */}
            <p style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontStyle: 'italic',
            }}>
              Already have an account?{' '}
              <Link
                href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}
                style={{ color: 'var(--text-gold)', textDecoration: 'none' }}
              >
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js App Router
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
