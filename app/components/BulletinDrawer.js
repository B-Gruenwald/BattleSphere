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
}) {
  const [isOpen,                 setIsOpen]                 = useState(false);
  const [isEditing,              setIsEditing]              = useState(false);
  const [isNewDispatch,          setIsNewDispatch]          = useState(false);
  const [expandedId,             setExpandedId]             = useState(null);
  const [saving,                 setSaving]                 = useState(false);
  const [deleting,               setDeleting]               = useState(false);
  const [saveError,              setSaveError]              = useState(null);
  const [liveDispatch,           setLiveDispatch]           = useState(currentDispatch);
  const [livePreviousDispatches, setLivePreviousDispatches] = useState(previousDispatches ?? []);

  const [form, setForm] = useState({
    act_label:       currentDispatch?.act_label       ?? '',
    dispatch_number: currentDispatch?.dispatch_number ?? '',
    title:           currentDispatch?.title           ?? '',
    body:            currentDispatch?.body            ?? '',
    week_label:      currentDispatch?.week_label      ?? '',
  });

  // ── Auto-enter edit mode when opening with no dispatch ──
  useEffect(() => {
    if (isOpen && !liveDispatch && isOrganiser) {
      setIsEditing(true);
    }
  }, [isOpen]);

  // ── Close on Escape ──
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { setIsOpen(false); setIsEditing(false); setIsNewDispatch(false); }
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

  // ── Keep form in sync if prop changes ──
  useEffect(() => {
    setLiveDispatch(currentDispatch);
    setLivePreviousDispatches(previousDispatches ?? []);
    setForm({
      act_label:       currentDispatch?.act_label       ?? '',
      dispatch_number: currentDispatch?.dispatch_number ?? '',
      title:           currentDispatch?.title           ?? '',
      body:            currentDispatch?.body            ?? '',
      week_label:      currentDispatch?.week_label      ?? '',
    });
  }, [currentDispatch, previousDispatches]);

  // ── Open drawer in "new dispatch" mode (archive current, write fresh) ──
  function handleNewDispatch() {
    setForm({
      act_label:       liveDispatch?.act_label ?? '',
      dispatch_number: liveDispatch?.dispatch_number
        ? String(Number(liveDispatch.dispatch_number) + 1)
        : '',
      title:           '',
      body:            '',
      week_label:      '',
    });
    setIsNewDispatch(true);
    setIsEditing(true);
    setIsOpen(true);
  }

  // ── Save: archive+insert (new dispatch), UPDATE (edit), or INSERT (first ever) ──
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();

    if (isNewDispatch && liveDispatch?.id) {
      // Archive the current dispatch
      const { error: archiveError } = await supabase
        .from('bulletin_dispatches')
        .update({ is_current: false })
        .eq('id', liveDispatch.id);
      if (archiveError) { setSaving(false); setSaveError(archiveError.message); return; }

      // Insert the new current dispatch
      const { data, error } = await supabase
        .from('bulletin_dispatches')
        .insert({
          campaign_id:     campaignId,
          act_label:       form.act_label,
          dispatch_number: Number(form.dispatch_number) || 1,
          title:           form.title,
          body:            form.body,
          week_label:      form.week_label,
          is_current:      true,
        })
        .select('*')
        .single();

      setSaving(false);
      if (error) { setSaveError(error.message); return; }
      setLivePreviousDispatches(prev => [{ ...liveDispatch, is_current: false }, ...prev]);
      setLiveDispatch(data);
      setIsEditing(false);
      setIsNewDispatch(false);
      // Discord notification for new dispatch
      fetch('/api/discord/notify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'bulletin', campaignId, campaignSlug, dispatch: data }),
      }).catch(() => {});

    } else if (liveDispatch?.id) {
      // UPDATE existing dispatch
      const { data, error } = await supabase
        .from('bulletin_dispatches')
        .update({
          act_label:       form.act_label,
          dispatch_number: Number(form.dispatch_number) || 1,
          title:           form.title,
          body:            form.body,
          week_label:      form.week_label,
        })
        .eq('id', liveDispatch.id)
        .select('*')
        .single();

      setSaving(false);
      if (error) { setSaveError(error.message); return; }
      setLiveDispatch(data);
      setIsEditing(false);

    } else {
      // INSERT first dispatch for this campaign
      const { data, error } = await supabase
        .from('bulletin_dispatches')
        .insert({
          campaign_id:     campaignId,
          act_label:       form.act_label,
          dispatch_number: Number(form.dispatch_number) || 1,
          title:           form.title,
          body:            form.body,
          week_label:      form.week_label,
          is_current:      true,
        })
        .select('*')
        .single();

      setSaving(false);
      if (error) { setSaveError(error.message); return; }
      setLiveDispatch(data);
      setIsEditing(false);
      // Discord notification for first-ever dispatch
      fetch('/api/discord/notify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'bulletin', campaignId, campaignSlug, dispatch: data }),
      }).catch(() => {});
    }
  }

  // ── Delete current dispatch ──
  async function handleDelete() {
    if (!liveDispatch?.id) return;
    if (!window.confirm('Permanently delete this dispatch? This cannot be undone.')) return;
    setDeleting(true);
    setSaveError(null);
    const supabase = createClient();

    const { error } = await supabase
      .from('bulletin_dispatches')
      .delete()
      .eq('id', liveDispatch.id);

    if (error) { setDeleting(false); setSaveError(error.message); return; }

    // Promote most recent previous dispatch to current (if any)
    if (livePreviousDispatches.length > 0) {
      const toPromote = livePreviousDispatches[0];
      await supabase
        .from('bulletin_dispatches')
        .update({ is_current: true })
        .eq('id', toPromote.id);
      setLiveDispatch({ ...toPromote, is_current: true });
      setLivePreviousDispatches(prev => prev.slice(1));
    } else {
      setLiveDispatch(null);
    }

    setDeleting(false);
    setIsEditing(false);
    setIsNewDispatch(false);
    setForm({ act_label: '', dispatch_number: '', title: '', body: '', week_label: '' });
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
    setIsNewDispatch(false);
    setSaveError(null);
    // If we were in "post first dispatch" mode and cancelled, close drawer
    if (!liveDispatch) setIsOpen(false);
  }

  const issuedDate = liveDispatch?.issued_at
    ? new Date(liveDispatch.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const displayWeekLabel = liveDispatch?.week_label ?? '';

  const territoryNames = Object.keys(territoryMap || {});
  const factionNames   = Object.keys(factionMap   || {});

  return (
    <>
      {/* ── Panel footer (always visible inside BulletinPanel) ── */}
      <div className="bulletin-footer">
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="read-more-btn" onClick={() => setIsOpen(true)}>
            {liveDispatch ? 'Read full dispatch →' : (isOrganiser ? 'Post first dispatch →' : 'No dispatch yet')}
          </button>
          {isOrganiser && liveDispatch && (
            <button
              className="read-more-btn"
              onClick={handleNewDispatch}
              style={{ opacity: 0.7, fontSize: '0.6rem' }}
            >
              + New Dispatch
            </button>
          )}
        </div>
        {displayWeekLabel && issuedDate && (
          <span className="bulletin-meta">
            {displayWeekLabel} · {issuedDate}
          </span>
        )}
      </div>

      {/* ── Drawer overlay + panel ── */}
      {isOpen && (
        <>
          <div
            className="drawer-overlay"
            onClick={() => { setIsOpen(false); setIsEditing(false); }}
          />

          <div className="bulletin-drawer">

            {/* Sticky header */}
            <div className="drawer-header">
              <div>
                {liveDispatch && (
                  <p className="drawer-act-label">
                    {liveDispatch.act_label}
                    {liveDispatch.dispatch_number ? ` · Dispatch No. ${liveDispatch.dispatch_number}` : ''}
                  </p>
                )}
                <h2 className="drawer-title">
                  {isEditing && isNewDispatch
                    ? 'New Dispatch'
                    : isEditing && !liveDispatch
                    ? 'Post First Dispatch'
                    : (liveDispatch?.title ?? 'Campaign Bulletin')}
                </h2>
              </div>
              <button
                className="drawer-close"
                onClick={() => { setIsOpen(false); setIsEditing(false); }}
                aria-label="Close"
              >✕</button>
            </div>

            {/* Scrollable body */}
            <div className="drawer-body">

              {/* ── Edit / New dispatch form ── */}
              {isEditing && isOrganiser ? (
                <div className="bulletin-edit-form">

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
                        placeholder="1"
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
                    <label>Body text</label>
                    <div className="edit-hint-block">
                      <p className="edit-hint">
                        <strong>Headings:</strong> Start a line with <code>## </code> for a section heading.
                      </p>
                      <p className="edit-hint">
                        <strong>Auto-links:</strong> Writing an exact territory or faction name links it automatically (see names below).
                      </p>
                      <p className="edit-hint">
                        <strong>Custom links:</strong> Use <code>{'[[Target|display text]]'}</code> to link any phrase to a territory or faction — the Target must match a name below, but the display text can be anything you like. Example:
                      </p>
                      <p className="edit-hint-example">
                        <code>{'the [[Forces of the Hivemind|Genestealer Cults]] struck at dawn'}</code>
                      </p>
                      <p className="edit-hint" style={{ marginTop: '0.25rem' }}>
                        → displays <em>"the Genestealer Cults struck at dawn"</em> as a link to Forces of the Hivemind.
                      </p>
                    </div>
                    <textarea
                      value={form.body}
                      onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                      rows={14}
                      placeholder={'## Opening heading\n\nFirst paragraph of narrative text…\n\nThe [[Forces of the Hivemind|Genestealer Cults]] struck at dawn.\n\n## Second heading\n\nMore text…'}
                    />
                  </div>

                  {/* ── Territory / faction link helper ── */}
                  {(territoryNames.length > 0 || factionNames.length > 0) && (
                    <div className="edit-link-helper">
                      <p className="edit-link-helper-title">Auto-links</p>
                      <p className="edit-link-helper-desc">
                        These names are recognised in your text and become clickable links automatically.
                        Use the exact spelling shown below.
                      </p>
                      {territoryNames.length > 0 && (
                        <div className="edit-link-group">
                          <span className="edit-link-group-label">Territories →</span>
                          <div className="edit-link-chips">
                            {territoryNames.map(name => (
                              <span key={name} className="edit-chip edit-chip--territory">{name}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {factionNames.length > 0 && (
                        <div className="edit-link-group">
                          <span className="edit-link-group-label">Factions →</span>
                          <div className="edit-link-chips">
                            {factionNames.map(name => (
                              <span key={name} className="edit-chip edit-chip--faction">{name}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="edit-field">
                    <label>Week Label</label>
                    <input
                      type="text"
                      value={form.week_label}
                      onChange={e => setForm(f => ({ ...f, week_label: e.target.value }))}
                      placeholder="Campaign Week 1"
                    />
                  </div>

                  {saveError && (
                    <p style={{ color: 'var(--crimson-bright)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      Error: {saveError}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn-primary"
                      onClick={handleSave}
                      disabled={saving}
                      style={{ fontSize: '0.6rem' }}
                    >
                      {saving
                        ? 'Saving…'
                        : isNewDispatch
                        ? 'Publish New Dispatch'
                        : liveDispatch
                        ? 'Save Dispatch'
                        : 'Post Dispatch'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={handleCancelEdit}
                      style={{ fontSize: '0.6rem' }}
                    >
                      Cancel
                    </button>
                  </div>

                  {/* ── Delete — only for existing dispatches, not when writing new/first ── */}
                  {liveDispatch?.id && !isNewDispatch && (
                    <div style={{
                      marginTop: '1.5rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{
                          background:    'transparent',
                          border:        '1px solid var(--crimson-bright, #c0392b)',
                          color:         'var(--crimson-bright, #c0392b)',
                          padding:       '0.4rem 0.9rem',
                          borderRadius:  '4px',
                          fontSize:      '0.58rem',
                          cursor:        deleting ? 'not-allowed' : 'pointer',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          opacity:       deleting ? 0.6 : 1,
                        }}
                      >
                        {deleting ? 'Deleting…' : '🗑 Delete Dispatch'}
                      </button>
                      <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Permanently removes this dispatch. Cannot be undone.
                      </p>
                    </div>
                  )}
                </div>

              ) : (
                /* ── Full bulletin text — two columns ── */
                liveDispatch?.body ? (
                  <div className="drawer-text-cols">
                    {renderBulletinText(liveDispatch.body, territoryMap, factionMap, campaignSlug)}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No bulletin text posted yet.
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
                  {isOrganiser && (
                    <button
                      className="btn-secondary"
                      onClick={() => setIsEditing(true)}
                      style={{ fontSize: '0.58rem' }}
                    >
                      {liveDispatch ? '✎ Edit Bulletin' : '✎ Post Bulletin'}
                    </button>
                  )}
                </div>
              )}

              {/* ── Previous Dispatches accordion ── */}
              {livePreviousDispatches && livePreviousDispatches.length > 0 && !isEditing && (
                <div className="drawer-previous">
                  <p className="drawer-previous-label">Previous Dispatches</p>
                  {livePreviousDispatches.map(pd => {
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
                            <span className="accordion-dispatch-num">Dispatch No. {pd.dispatch_number}</span>
                            <span className="accordion-title">{pd.title}</span>
                          </div>
                          <span
                            className="accordion-chevron"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          >▾</span>
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
