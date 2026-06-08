import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

async function guardAdmin(supabase, user) {
  if (!user) return false;
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  return !!data?.is_admin;
}

// POST — create a new post
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!await guardAdmin(supabase, user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title, summary, content, type, cover_url, is_published } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const admin = createAdminClient();
  const baseSlug = slugify(title);

  // Ensure slug uniqueness by appending a suffix if needed
  let slug = baseSlug;
  const { data: existing } = await admin.from('blog_posts').select('slug').like('slug', `${baseSlug}%`);
  if ((existing || []).some(r => r.slug === baseSlug)) {
    slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  const { data, error } = await admin.from('blog_posts').insert({
    author_id:    user.id,
    title:        title.trim(),
    slug,
    summary:      summary?.trim() || null,
    body:         content?.trim() || '',
    type:         type || 'general',
    cover_url:    cover_url?.trim() || null,
    is_published: !!is_published,
    published_at: is_published ? new Date().toISOString() : null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

// PATCH — update an existing post
export async function PATCH(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!await guardAdmin(supabase, user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, title, summary, content, type, cover_url, is_published } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();

  // Fetch current to check if publishing for first time
  const { data: current } = await admin.from('blog_posts').select('is_published, published_at').eq('id', id).single();
  const publishingNow = is_published && !current?.is_published;

  const { data, error } = await admin.from('blog_posts').update({
    title:        title?.trim(),
    summary:      summary?.trim() || null,
    body:         content?.trim() ?? '',
    type:         type || 'general',
    cover_url:    cover_url?.trim() || null,
    is_published: !!is_published,
    published_at: publishingNow ? new Date().toISOString() : (current?.published_at ?? null),
  }).eq('id', id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

// DELETE — delete a post
export async function DELETE(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!await guardAdmin(supabase, user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('blog_posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
