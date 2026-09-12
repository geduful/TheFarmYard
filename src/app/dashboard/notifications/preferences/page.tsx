'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { NotificationPreference, NotificationCategory } from '@/lib/types';
import { NOTIFICATION_CATEGORY_CONFIG } from '@/lib/types';

const categoryFields: { key: NotificationCategory; field: keyof NotificationPreference }[] = [
  { key: 'marketplace', field: 'marketplace_enabled' },
  { key: 'orders', field: 'orders_enabled' },
  { key: 'verification', field: 'verification_enabled' },
  { key: 'reputation', field: 'reputation_enabled' },
  { key: 'logistics', field: 'logistics_enabled' },
  { key: 'storage', field: 'storage_enabled' },
  { key: 'funding', field: 'funding_enabled' },
  { key: 'platform', field: 'platform_enabled' },
];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setPrefs(data.preferences);
      } catch {} finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function togglePref(field: keyof NotificationPreference) {
    if (!prefs) return;
    const newValue = !prefs[field];
    const previousValue = prefs[field];
    setPrefs({ ...prefs, [field]: newValue });
    setSaveMsg('');
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences);
        setSaveMsg('Saved');
        setTimeout(() => setSaveMsg(''), 2000);
      } else {
        setPrefs({ ...prefs, [field]: previousValue });
      }
    } catch {
      setPrefs({ ...prefs, [field]: previousValue });
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-6 bg-gray-100 rounded-full w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
      <Link href="/dashboard/notifications" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-farm-green transition mb-4 group">
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Notifications
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-farm-green" />
            Notification Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Control which notifications you receive</p>
        </div>
        {saveMsg && (
          <span className="text-sm text-farm-green font-medium animate-fade-in flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {saveMsg}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {categoryFields.map(({ key, field }) => {
          const config = NOTIFICATION_CATEGORY_CONFIG[key];
          const enabled = prefs ? Boolean(prefs[field]) : true;
          return (
            <div key={key}
              className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{config.label}</p>
                  <p className="text-xs text-gray-400 truncate">{config.description}</p>
                </div>
              </div>
              <button
                onClick={() => togglePref(field)}
                disabled={key === 'platform'}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-farm-green focus:ring-offset-2 ${
                  enabled ? 'bg-farm-green' : 'bg-gray-200'
                } ${key === 'platform' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                role="switch"
                aria-checked={enabled}
                aria-label={`Toggle ${config.label} notifications`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">About notifications</h3>
        <ul className="text-xs text-gray-500 space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-farm-green mt-0.5">•</span>
            Critical notifications (security, delivery issues) cannot be disabled
          </li>
          <li className="flex items-start gap-2">
            <span className="text-farm-green mt-0.5">•</span>
            Duplicate notifications are automatically prevented
          </li>
          <li className="flex items-start gap-2">
            <span className="text-farm-green mt-0.5">•</span>
            You can mark notifications as read individually or all at once
          </li>
        </ul>
      </div>
    </div>
  );
}
