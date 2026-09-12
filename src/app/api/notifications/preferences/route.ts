import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: initialData, error: initialError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let data = initialData;

    // Auto-create if not exists
    if (!data) {
      const { data: created, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id })
        .select('*')
        .single();
      if (insertError) throw insertError;
      data = created;
    }

    if (initialError && initialError.code !== 'PGRST116') throw initialError;

    return NextResponse.json({ preferences: data });
  } catch (error) {
    console.error('Notification preferences GET error:', error);
    return NextResponse.json({ error: 'Failed to load preferences.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const allowedFields = [
      'marketplace_enabled',
      'orders_enabled', 'verification_enabled', 'reputation_enabled',
      'logistics_enabled', 'storage_enabled', 'funding_enabled', 'platform_enabled',
    ];

    const updates: Record<string, boolean> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = Boolean(body[field]);
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString() as unknown as boolean;

    // Ensure preferences exist
    try {
      await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id })
        .select()
        .single();
    } catch { /* ignore - may already exist */ }

    const { data, error } = await supabase
      .from('notification_preferences')
      .update(updates)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Update succeeded but could not read back.' }, { status: 500 });
    }

    return NextResponse.json({ preferences: data });
  } catch (error) {
    console.error('Notification preferences PUT error:', error);
    return NextResponse.json({ error: 'Failed to update preferences.' }, { status: 500 });
  }
}
