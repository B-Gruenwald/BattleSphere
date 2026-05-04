'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Support ?redirect=/join/abc123 so invite links work for unauthenticated users
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  async function handleDiscordLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${redirectTo !== '/dashboard' ? `?next=${encodeURIComponent(redirectTo)}` : ''}`,
      },
    });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    } else {
      router.push(redirectTo);
      router.refresh();
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
            Welcome back, Commander
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '0.06em' }}>
            Sign In
          </h1>
        </div>

        {/* Invite banner — shown when arriving via an invite link */}
        {redirectTo.startsWith('/join/') && (
          <div style={{
            border: '1px solid rgba(183,140,64,0.4)',
            background: 'rgba(183,140,64,0.06)',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--text-gold)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              You've been invited to join a campaign. Sign in to accept.
            </p>
          </div>
        )}

        {/* Discord button */}
        <button
          type="button"
          onClick={handleDiscordLogin}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1rem',
            background: '#5865F2',
            border: '1px solid #4752c4',
            color: '#ffffff',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            marginBottom: '1.5rem',
          }}
        >
          {/* Discord logo SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Continue with Discord
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)' }} />
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.55rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                textDecoration: 'none',
              }}>
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Your password"
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
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {/* Link to register — preserves redirect param for invite flow */}
          <p style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            fontStyle: 'italic',
          }}>
            No account yet?{' '}
            <Link
              href={redirectTo.startsWith('/join/') ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'}
              style={{ color: 'var(--text-gold)', textDecoration: 'none' }}
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js App Router
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
