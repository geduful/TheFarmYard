'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { EscrowTransaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import PhoneInput from '@/components/ui/PhoneInput';

export default function DispatchPage() {
  const router = useRouter();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tx, setTx] = useState<EscrowTransaction | null>(null);
  const [licensePlate, setLicensePlate] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [waybillFile, setWaybillFile] = useState<File | null>(null);
  const [waybillPreview, setWaybillPreview] = useState<string | null>(null);
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

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!tx) { setError('Transaction not found.'); return; }
    if (tx.status !== 'held_in_escrow') { setError('This transaction can no longer be dispatched.'); return; }
    if (!licensePlate.trim()) { setError('Vehicle license plate is required.'); return; }
    if (driverPhone.replace(/\D/g, '').length < 12) { setError('Enter a valid driver phone number.'); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== tx.farmer_id) { setError('You are not authorized to dispatch this transaction.'); setSubmitting(false); return; }
    let waybillUrl: string | null = null;
    if (waybillFile) {
      try {
        waybillUrl = await fileToBase64(waybillFile);
      } catch {
        setError('Failed to process waybill image. Please try again.');
        setSubmitting(false);
        return;
      }
    }
    const { error: updateError } = await supabase.from('escrow_transactions').update({
      vehicle_license_plate: licensePlate.trim(), driver_phone_number: driverPhone,
      waybill_receipt_url: waybillUrl, status: 'dispatched', dispatched_at: new Date().toISOString(),
    }).eq('id', params.id).eq('farmer_id', user.id).eq('status', 'held_in_escrow');
    if (updateError) { setError(updateError.message); setSubmitting(false); return; }
    router.push('/dashboard/farmer');
  }

  if (loading) return <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>;
  if (!tx) return <div className="flex items-center justify-center h-64 text-gray-500">Transaction not found or you are not authorized.</div>;
  if (tx.status !== 'held_in_escrow') return <div className="max-w-2xl mx-auto p-6 text-center text-gray-500">This transaction is already {tx.status.replace('_', ' ')} and can no longer be dispatched.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dashboard/farmer')} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dispatch Goods</h1>
          <p className="text-sm text-gray-500">Enter delivery details for this transaction</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-5 mb-6">
        <h3 className="font-semibold text-amber-900 mb-1">Transaction Summary</h3>
        <p className="text-sm text-amber-700">
          Listing: <span className="font-medium text-amber-800">{tx.listing?.title || 'N/A'}</span>
          {' | '}Amount: <span className="font-bold">{formatCurrency(tx.total_farmer_yield)}</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-alert-red text-sm rounded-xl flex items-center gap-2 animate-fade-in">
            <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold shrink-0">✕</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Registration / License Plate</label>
            <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g., ABC-123-XY"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Driver Phone Number</label>
            <PhoneInput value={driverPhone} onChange={setDriverPhone} required placeholder="Driver's number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Waybill Receipt Photo</label>
            <div className={`border-2 border-dashed rounded-xl p-4 text-center transition ${
              waybillPreview ? 'border-farm-green bg-farm-green/5' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
            }`}>
              {waybillPreview ? (
                <div className="space-y-3">
                  <img src={waybillPreview} alt="Waybill preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                  <div className="flex items-center justify-center gap-2">
                    <button type="button" onClick={() => { setWaybillFile(null); setWaybillPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                      Remove
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-farm-green hover:text-farm-green-light font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto cursor-pointer">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  </div>
                  <p className="text-sm text-gray-500 cursor-pointer"><span className="text-farm-green font-medium">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-gray-400">PNG, JPG or WEBP (max 5MB)</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return; }
                    setWaybillFile(file);
                    const reader = new FileReader();
                    reader.onload = () => setWaybillPreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Photo of the paper station waybill receipt as proof of dispatch</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={submitting}
              className="px-6 py-2.5 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 transition disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.98]">
              {submitting ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Dispatching...</span> : 'Confirm Dispatch'}
            </button>
            <Link href="/dashboard/farmer" className="px-6 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
