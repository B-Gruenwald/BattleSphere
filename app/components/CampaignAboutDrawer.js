'use client';

import { useState, useEffect, useCallback } from 'react';

export default function CampaignAboutDrawer({ campaignName, description, setting }) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') close();
  }, [close]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!description) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          background: 'none',
          border: '1px solid var(--border-dim)',
          borderRadius: '4px',
          padding: '0.25rem 0.65rem',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--text-gold)';
          e.currentTarget.style.color = 'var(--text-gold)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border-dim)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>ℹ</span>
        About
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="drawer-overlay"
          onClick={close}
          style={{ zIndex: 1000 }}
        />
      )}

      {/* Drawer */}
      <div
        className="bulletin-drawer"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          zIndex: 1001,
        }}
      >
        <div className="drawer-header">
          <div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.55rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-gold)',
              marginBottom: '0.25rem',
            }}>
              {setting || 'Campaign'}
            </p>
            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: '800',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
            }}>
              {campaignName}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0.2rem',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.52rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '1rem',
          }}>
            About this campaign
          </p>
          <p style={{
            fontSize: '0.92rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
          }}>
            {description}
          </p>
        </div>
      </div>
    </>
  );
}
