'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Notification, NotificationCategory } from '@/lib/types';
import { NOTIFICATION_CATEGORY_CONFIG, NOTIFICATION_PRIORITY_CONFIG } from '@/lib/types';

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' });
}

const categories: NotificationCategory[] = [
  'marketplace', 'orders', 'verification',
  'reputation', 'logistics', 'storage', 'platform',
];

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
        if (category !== 'all') params.set('category', category);
        if (unreadOnly) params.set('unread', 'true');
        const res = await fetch(`/api/notifications?${params}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setNotifications(data.notifications || []);
          setTotal(data.total || 0);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {} finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [category, unreadOnly, page]);

  async function markAsRead(id: number) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try { await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId: id }) }); } catch {}
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
    try { await fetch('/api/notifications/read-all', { method: 'POST' }); } catch {}
  }

  function handleNotificationClick(n: Notification) {
    if (!n.read_at) markAsRead(n.id);
    if (n.action_url) router.push(n.action_url);
  }

  const hasMore = (page + 1) * limit < total;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-farm-green transition mb-4 group">
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-farm-green" />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead}
              className="px-4 py-2 bg-white text-farm-green text-sm font-semibold rounded-xl border border-farm-green/20 hover:bg-farm-green/5 transition shadow-sm active:scale-[0.98]">
              Mark all read
            </button>
          )}
          <Link href="/dashboard/notifications/preferences"
            className="px-4 py-2 bg-white text-gray-600 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition shadow-sm active:scale-[0.98] flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        <button onClick={() => { setCategory('all'); setPage(0); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
            category === 'all' ? 'bg-farm-green text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          All
        </button>
        {categories.map((c) => (
          <button key={c} onClick={() => { setCategory(c); setPage(0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              category === c ? 'bg-farm-green text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {NOTIFICATION_CATEGORY_CONFIG[c].label}
          </button>
        ))}
      </div>

      {/* Unread toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setUnreadOnly(!unreadOnly); setPage(0); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            unreadOnly ? 'bg-farm-green text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          Unread only
        </button>
        <span className="text-xs text-gray-400">{total} notification{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-50 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-farm-green/10 to-emerald-green/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-farm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No notifications</h3>
          <p className="text-sm text-gray-500 mb-5">
            {unreadOnly ? 'All caught up! No unread notifications.' : 'You\'ll be notified about important updates.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const catConfig = NOTIFICATION_CATEGORY_CONFIG[n.category];
            const priConfig = NOTIFICATION_PRIORITY_CONFIG[n.priority];
            return (
              <button key={n.id} onClick={() => handleNotificationClick(n)}
                className={`w-full text-left bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all animate-fade-in ${
                  !n.read_at ? 'border-l-4 border-l-farm-green bg-farm-green/5' : ''
                } ${n.priority === 'critical' ? 'border-l-4 border-l-red-500' : n.priority === 'high' ? 'border-l-4 border-l-amber-500' : ''}`}>
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm ${!n.read_at ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {n.title}
                        </h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priConfig?.bgColor} ${priConfig?.color}`}>
                          {priConfig?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!n.read_at && <span className="w-2 h-2 rounded-full bg-farm-green" />}
                        <span className="text-[11px] text-gray-400">{formatTimeAgo(n.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                        {catConfig?.label}
                      </span>
                      {n.action_url && (
                        <span className="text-[10px] text-farm-green font-medium">View →</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Pagination */}
          {(page > 0 || hasMore) && (
            <div className="flex justify-center gap-2 pt-4">
              {page > 0 && (
                <button onClick={() => setPage(page - 1)}
                  className="px-4 py-2 bg-white text-gray-600 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                  Previous
                </button>
              )}
              {hasMore && (
                <button onClick={() => setPage(page + 1)}
                  className="px-4 py-2 bg-white text-gray-600 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
