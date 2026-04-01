'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DeleteAchievementButton({ achievementId, slug }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Remove this achievement? This cannot be undone.')) return;
    setLoading(true);
    await supabase.from('achievements').delete().eq('id', achievementId);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Remove achievement"
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        padding: '0.2rem',
        lineHeight: 1,
        flexShrink: 0,
        opacity: loading ? 0.4 : 1,
        transition: 'color 0.15s',
      }}
    >
      ✕
    </button>
  );
}
