import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = request.nextUrl;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const category = url.searchParams.get('category');
    const unreadOnly = url.searchParams.get('unread') === 'true';

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category', category);
    if (unreadOnly) query = query.is('read_at', null);

    const { data, error, count } = await query;
    if (error) throw error;

    // Get unread count separately (efficient)
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    return NextResponse.json({
      notifications: data || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    const detail = error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'object' && error !== null
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : String(error);
    console.error('Notifications GET error:', detail);
    return NextResponse.json({ error: 'Failed to load notifications.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if user is admin (admins can create announcements)
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { userIds, type, category, title, message, priority, actionUrl, entityType, entityId, metadata } = body;

    if (!userIds?.length || !type || !category || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userIds[0],
      p_type: type,
      p_category: category,
      p_title: title,
      p_message: message,
      p_priority: priority || 'normal',
      p_action_url: actionUrl || null,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_metadata: metadata ? JSON.stringify(metadata) : null,
      p_deduplication_key: null,
    });

    if (error) throw error;

    return NextResponse.json({ id: data });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ error: 'Failed to create notification.' }, { status: 500 });
  }
}
