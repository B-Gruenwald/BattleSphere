'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { renderBulletinText } from '@/app/lib/bulletinText';

export default function BulletinDrawer({
  currentDispatch,
  previousDispatches,
  isOrganiser,
  campaignSlug,
  campaignId,
  territoryMap,
  factionMap,
  weekLabel,
}) {
  const [isOpen,          setIsOpen]          = useState(false);
  const [isEditing,       setIsEditing]        = useState(false);
  const [expandedId,      setExpandedId]       = useState(null);
  const [saving,          setSaving]           = useState(false);
  const [saveError,       setSaveError]        = useState(null);
  const [liveDispatch,    setLiveDispatch]     = useState(currentDispatch);

  const [form, setForm] = useState({
    act_label:       currentDispatch?.act_label       ?? '',
    dispatch_number: currentDispatch?.dispatch_number ?? '',
    title:           currentDispatch?.title           ?? '',
    body:            currentDispatch?.body            ?? '',
    week_label:      currentDispatch?.week_label      ?? '',
  });

  // Close on Escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setIsEditing(false);
    }
  }, []);

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

  // Keep form in sync if the dispatch prop changes (e.g. after save + router refresh)
  useEffect(() => {
    setLiveDispatch(currentDispatch);
    setForm({
      act_label:       currentDispatch?.act_label       ?? '',
      dispatch_number: currentDispatch?.dispatch_number ?? '',
      title:           currentDispatch?.title           ?? '',
      body:            currentDispatch?.body            ?? '',
      week_label:      currentDispatch?.week_label      ?? '',
    });
  }, [currentDispatch]);

  async function handleSave() {
    if (!liveDispatch?.id) return;
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bulletin_dispatches')
      .update({
        act_label:       form.act_label,
        dispatch_number: Number(form.dispatch_number),
        title:           form.title,
        body:            form.body,
        week_label:      form.week_label,
      })
      .eq('id', liveDispatch.id)
      .select('*')
      .single();

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setLiveDispatch(data);
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setForm({
      act_label:       liveDispatch?.act_label       ?? '',
      dispatch_number: liveDispatch?.dispatch_number ?? '',
      title:           liveDispatch?.title           ?? '',
      body:            liveDispatch?.body            ?? '',
      week_label:      liveDispatch?.week_label      ?? '',
    });
    setIsEditing(false);
    setSaveError(null);
  }

  const issuedDate = liveDispatch?.issued_at
    ? new Date(liveDispatch.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const displayWeekLabel = liveDispatch?.week_label ?? weekLabel ?? '';

  return (
    <>
      {/* ── Panel footer (always visible inside BulletinPanel) ── */}
      <div className="bulletin-footer">
        {liveDispatch ? (
          <button className="read-more-btn" onClick={() => setIsOpen(true)}>
            Read full dispatch →
          </button>
        ) : (
          isOrganiser
            ? <button className="read-more-btn" onClick={() => setIsOpen(true)}>Post first dispatch →</button>
            : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No dispatch yet.</span>
        )}
        {displayWeekLabel && issuedDate && (
          <span className="bulletin-meta">
            {displayWeekLabel} · {issuedDate}
          </span>
        )}
      </div>

      {/* ── Drawer overlay + panel ── */}
      {isOpen && (
        <>
          {/* Darkened overlay */}
          <div
            className="drawer-overlay"
            onClick={() => { setIsOpen(false); setIsEditing(false); }}
          />

          {/* Slide-in drawer */}
          <div className="bulletin-drawer">

            {/* Sticky header */}
            <div className="drawer-header">
              <div>
                {liveDispatch && (
                  <p className="drawer-act-label">
                    {liveDispatch.act_label} · Dispatch No.&nbsp;{liveDispatch.dispatch_number}
                  </p>
                )}
                <h2 className="drawer-title">
                  {liveDispatch?.title ?? 'Campaign Bulletin'}
                </h2>
              </div>
              <button
                className="drawer-close"
                onClick={() => { setIsOpen(false); setIsEditing(false); }}
                aria-label="Close dispatch"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="drawer-body">

              {/* ── Edit form (organisers only, when editing) ── */}
              {isEditing && isOrganiser ? (
                <div className="bulletin-edit-form">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '1.5rem' }}>
                    Edit Dispatch
                  </h3>

                  <div className="edit-field-row">
                    <div className="edit-field">
                      <label>Act Label</label>
                      <input
                        type="text"
                        value={form.act_label}
                        onChange={e => setForm(f => ({ ...f, act_label: e.target.value }))}
                        placeholder="Act II — The Fractured Subsector"
                      />
                    </div>
                    <div className="edit-field edit-field--narrow">
                      <label>Dispatch No.</label>
                      <input
                        type="number"
                        value={form.dispatch_number}
                        onChange={e => setForm(f => ({ ...f, dispatch_number: e.target.value }))}
                        placeholder="7"
                      />
                    </div>
                  </div>

                  <div className="edit-field">
                    <label>Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="The Tide Turns at Stiria"
                    />
                  </div>

                  <div className="edit-field">
                    <label>Body</label>
                    <textarea
                      value={form.body}
                      onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                      rows={14}
                      placeholder="Write your dispatch here…"
                    />
                  </div>

                  <div className="edit-field">
                    <label>Week Label</label>
                    <input
                      type="text"
                      value={form.week_label}
                      onChange={e => setForm(f => ({ ...f, week_label: e.target.value }))}
                      placeholder="Campaign Week 3"
                    />
                  </div>

                  {saveError && (
                    <p style={{ color: 'var(--crimson-bright)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      {saveError}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn-primary"
                      onClick={handleSave}
                      disabled={saving}
                      style={{ fontSize: '0.6rem' }}
                    >
                      {saving ? 'Saving…' : 'Save Dispatch'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={handleCancelEdit}
                      style={{ fontSize: '0.6rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Full bulletin text — two columns ── */
                liveDispatch?.body ? (
                  <div className="drawer-text-cols">
                    {renderBulletinText(liveDispatch.body, territoryMap, factionMap, campaignSlug)}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No bulletin text yet.
                  </p>
                )
              )}

              {/* ── Drawer footer ── */}
              {!isEditing && (
                <div className="drawer-footer">
                  <span className="drawer-footer-meta">
                    Issued by the Chronicler
                    {displayWeekLabel ? ` · ${displayWeekLabel}` : ''}
                    {issuedDate ? ` · ${issuedDate}` : ''}
                  </span>
                  {isOrganiser && liveDispatch && (
                    <button
                      className="btn-secondary"
                      onClick={() => setIsEditing(true)}
                      style={{ fontSize: '0.58rem' }}
                    >
                      ✎ Edit Bulletin
                    </button>
                  )}
                </div>
              )}

              {/* ── Previous Dispatches accordion ── */}
              {previousDispatches && previousDispatches.length > 0 && !isEditing && (
                <div className="drawer-previous">
                  <p className="drawer-previous-label">Previous Dispatches</p>
                  {previousDispatches.map(pd => {
                    const isExpanded = expandedId === pd.id;
                    const pdDate = pd.issued_at
                      ? new Date(pd.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : null;
                    return (
                      <div key={pd.id} className="accordion-item">
                        <button
                          className="accordion-trigger"
                          onClick={() => setExpandedId(isExpanded ? null : pd.id)}
                        >
                          <div>
                            <span className="accordion-dispatch-num">
                              Dispatch No.&nbsp;{pd.dispatch_number}
                            </span>
                            <span className="accordion-title">{pd.title}</span>
                          </div>
                          <span
                            className="accordion-chevron"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          >
                            ▾
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="accordion-body">
                            {pdDate && (
                              <p className="accordion-meta">
                                {pd.week_label ? `${pd.week_label} · ` : ''}{pdDate}
                              </p>
                            )}
                            <div className="accordion-text">
                              {renderBulletinText(pd.body, territoryMap, factionMap, campaignSlug)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>{/* end drawer-body */}
          </div>
        </>
      )}
    </>
  );
}
