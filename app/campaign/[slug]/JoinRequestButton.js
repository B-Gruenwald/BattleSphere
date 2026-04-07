'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function JoinRequestButton({ campaignId, campaignSlug, userId, isMember, existingRequest: initialRequest }) {
  const [request, setRequest]   = useState(initialRequest);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  // Already a member
  if (isMember) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '0.6rem',
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--text-gold)',
        }}>
          ◆ You are a member of this campaign
        </p>
        <Link href={`/c/${campaignSlug}`} style={{ textDecoration: 'none' }}>
          <button className="btn-primary">Go to Campaign Dashboard →</button>
        </Link>
      </div>
    );
  }

  // Not logged in — direct to login
  if (!userId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
          You need an account to request access.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href={`/login?redirect=/campaign/${campaignSlug}`} style={{ textDecoration: 'none' }}>
            <button className="btn-primary">Log In to Request Access</button>
          </Link>
          <Link href={`/register?redirect=/campaign/${campaignSlug}`} style={{ textDecoration: 'none' }}>
            <button className="btn-secondary">Create Account</button>
          </Link>
        </div>
      </div>
    );
  }

  // Request is pending
  if (request?.status === 'pending') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1.25rem',
          border: '1px solid rgba(183,140,64,0.35)',
          color: 'var(--text-gold)',
        }}>
          <span style={{ fontSize: '0.9rem' }}>⏳</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.58rem',
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            Request Pending
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          The organiser will review your request.
        </p>
      </div>
    );
  }

  // Request was rejected
  if (request?.status === 'rejected') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1.25rem',
          border: '1px solid rgba(224,90,90,0.35)',
          color: '#e05a5a',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.58rem',
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            Request Not Approved
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          Contact the organiser directly if you believe this is a mistake.
        </p>
      </div>
    );
  }

  // Request was approved (shouldn't normally reach here since isMember should be true,
  // but handle gracefully in case of timing / state mismatch)
  if (request?.status === 'approved') {
    return (
      <Link href={`/c/${campaignSlug}`} style={{ textDecoration: 'none' }}>
        <button className="btn-primary">Go to Campaign Dashboard →</button>
      </Link>
    );
  }

  // No request yet — show submit button
  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/join-request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ campaignId }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Could not send your request. Please try again.');
      } else {
        setRequest({ status: 'pending' });
      }
    } catch (err) {
      console.error(err);
      setError('Could not send your request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      {error && (
        <p style={{ color: '#e05a5a', fontSize: '0.85rem' }}>{error}</p>
      )}
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading}
        style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Sending Request…' : 'Request to Join Campaign'}
      </button>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
        The organiser will be notified and can approve or decline.
      </p>
    </div>
  );
}
