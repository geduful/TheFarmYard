'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { EscrowTransaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/LoadingSkeleton';

export default function VerifyDeliveryPage() {
  const router = useRouter();
  const params = useParams();
  const [tx, setTx] = useState<EscrowTransaction | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('escrow_transactions').select('*, listing:listings(*)').eq('id', params.id).eq('farmer_id', user.id).single();
      setTx(data ?? null);
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!tx) { setError('Transaction not found.'); return; }
    if (tx.status !== 'dispatched') { setError('Only dispatched transactions can be verified.'); return; }
    if (token.length !== 6 || !/^\d{6}$/.test(token)) { setError('Please enter a valid 6-digit token.'); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== tx.farmer_id) { setError('You are not authorized for this transaction.'); setSubmitting(false); return; }
    if (token !== tx?.delivery_token) { setError('Invalid delivery token. Please check and try again.'); setSubmitting(false); return; }
    const { error: updateError } = await supabase.from('escrow_transactions').update({ status: 'released' }).eq('id', params.id).eq('farmer_id', user.id).eq('status', 'dispatched');
    if (updateError) { setError(updateError.message); setSubmitting(false); return; }
    router.push('/dashboard/farmer');
  }

  if (loading) return <div className="max-w-md mx-auto p-4 sm:p-6 space-y-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!tx) return <div className="flex items-center justify-center h-64 text-gray-500">Transaction not found or you are not authorized.</div>;
  if (tx.status === 'released') return <div className="flex items-center justify-center h-64 text-gray-500">Funds already released for this transaction.</div>;
  if (tx.status !== 'dispatched') return <div className="flex items-center justify-center h-64 text-gray-500">This transaction must be dispatched before verification (current: {tx.status.replace('_', ' ')}).</div>;

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold text-gray-900">Delivery Verification</h1>
        <p className="text-sm text-gray-500 mt-1">Enter the 6-digit token provided by the buyer</p>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-5 mb-6 text-center">
        <p className="text-sm font-semibold text-emerald-800 mb-1">{tx.listing?.title || 'Transaction'}</p>
        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(tx.total_farmer_yield)}</p>
        <p className="text-xs text-emerald-600 mt-1">Amount to release on token verification</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-alert-red text-sm rounded-xl flex items-center gap-2 animate-fade-in">
            <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold shrink-0">✕</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <input type="text" value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" maxLength={6} autoFocus
              className="w-full text-center text-3xl sm:text-4xl tracking-[0.4em] px-3 py-5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white font-mono" required />
          </div>

          <button type="submit" disabled={submitting || token.length !== 6}
            className="w-full py-3 bg-emerald-green text-white font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.98] text-base">
            {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</span> : 'Verify & Release Funds'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700">
            <strong>⚠️ Important:</strong> Only enter the token after the buyer has confirmed
            receipt of goods. Once verified, funds are released immediately and cannot be reversed.
          </p>
        </div>
      </div>

      <div className="text-center mt-6">
        <Link href="/dashboard/farmer" className="text-sm text-gray-500 hover:text-gray-700 transition">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
