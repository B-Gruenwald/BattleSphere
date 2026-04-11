'use client';

import { useState, useRef, useEffect } from 'react';

// Renders an event body with a 3-line clamp and an expand toggle.
// Only shows the button if the text actually overflows.
export default function EventCardBody({ body }) {
  const [expanded,    setExpanded]    = useState(false);
  const [overflows,   setOverflows]   = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // scrollHeight > clientHeight means text is taller than the clamped box
    setOverflows(el.scrollHeight > el.clientHeight + 2);
  }, [body]);

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <p
        ref={ref}
        className="event-card-desc"
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: expanded ? 'unset' : 3,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
        }}
      >
        {body}
      </p>
      {(overflows || expanded) && (
        <button
          className="event-expand-btn"
          onClick={e => { e.preventDefault(); setExpanded(v => !v); }}
        >
          {expanded ? 'Show less ↑' : 'Show full event →'}
        </button>
      )}
    </div>
  );
}
