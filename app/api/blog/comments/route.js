import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/app/lib/notifications';
import { createAdminClient } from '@/lib/supabase/admin';

// POST — submit a comment on a blog post
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You must be logged in to comment.' }, { status: 401 });

  const { post_id, body } = await req.json();
  if (!post_id || !body?.trim()) {
    return NextResponse.json({ error: 'post_id and body are required.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('blog_comments')
    .insert({ post_id, user_id: user.id, body: body.trim() })
    .select('*')
    .single();

  // Attach username for the client
  if (data) {
    const { data: prof } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    data.profiles = { username: prof?.username || 'User' };
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the post author (fire-and-forget)
  try {
    const admin = createAdminClient();
    const { data: post } = await admin
      .from('blog_posts')
      .select('author_id, title, slug')
      .eq('id', post_id)
      .single();
    if (post && post.author_id !== user.id) {
      const commenterUsername = data.profiles?.username || 'Someone';
      await createNotification(post.author_id, {
        type:  'blog_comment',
        title: `New comment on "${post.title}"`,
        body:  `${commenterUsername} left a comment on your post.`,
        link:  `/blog/${post.slug}`,
      });
    }
  } catch (_) {}

  return NextResponse.json({ comment: data });
}

// DELETE — soft-delete own comment (or admin deletes any)
export async function DELETE(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { comment_id } = await req.json();
  if (!comment_id) return NextResponse.json({ error: 'comment_id required' }, { status: 400 });

  // Check if admin
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();

  // Admins use admin client to bypass RLS; others rely on own_delete policy
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const client = profile?.is_admin ? createAdminClient() : supabase;

  const { error } = await client
    .from('blog_comments')
    .update({ is_deleted: true })
    .eq('id', comment_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
