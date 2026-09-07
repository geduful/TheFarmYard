'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { uploadFile, LISTING_IMAGES_BUCKET } from '@/lib/supabase/storage';
import type { Category, PriceUnit } from '@/lib/types';

const categories: Category[] = ['Crops & Grains', 'Livestock', 'Poultry', 'Aquaculture', 'Other'];
const priceUnits: PriceUnit[] = ['kg', 'tonne', 'bag', 'crate', 'box', 'litre', 'unit', 'dozen', 'bunch', 'sack'];

export default function NewListingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ farm_location: string } | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Crops & Grains');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('unit');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [qualityGrade, setQualityGrade] = useState('');
  const [availability, setAvailability] = useState('In Stock');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from('profiles').select('farm_location').eq('id', user.id).single();
        if (p) {
          setProfile(p);
          setLocation(p.farm_location || '');
        }
      }
    }
    loadProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const parsedPrice = parseFloat(price);
    if (!title.trim() || !quantity.trim()) { setError('Title and quantity are required.'); return; }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) { setError('Price must be greater than zero.'); return; }
    if (imageUrl && !/^https?:\/\/.+/i.test(imageUrl.trim())) { setError('Image URL must start with http(s)://'); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    let finalImageUrl = imageUrl.trim() || 'https://placehold.co/600x400?text=TheFarmYard';
    if (imageFile) {
      try {
        finalImageUrl = await uploadFile(LISTING_IMAGES_BUCKET, imageFile, { publicBucket: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Image upload failed.');
        setLoading(false);
        return;
      }
    }
    const { error: insertError } = await supabase.from('listings').insert({
      farmer_id: user.id, title: title.trim(), category, quantity_available: quantity.trim(),
      price_per_unit: parsedPrice, price_unit: priceUnit, image_url: finalImageUrl,
      description: description.trim() || null,
      location: location.trim() || profile?.farm_location || '',
      quality_grade: qualityGrade.trim() || null,
      availability,
      minimum_order: minimumOrder.trim() || null,
      harvest_date: harvestDate || null,
    });
    if (insertError) { setError(insertError.message); setLoading(false); return; }
    router.push('/dashboard/farmer');
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white text-lg shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Create New Listing</h1>
          <p className="text-sm text-gray-500">List your produce for buyers</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-alert-red text-sm rounded-xl flex items-center gap-2 animate-fade-in">
            <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold shrink-0">✕</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Boer Goats, Fresh Catfish, White Maize"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    category === cat ? 'border-farm-green bg-farm-green text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}>
                  <span className="text-xs">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity Available</label>
              <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 50"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" required />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1.5">Price Per Unit (GH₵)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00" step="0.01" min="0"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price Unit</label>
              <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value as PriceUnit)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green bg-white text-sm">
                {priceUnits.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quality / Grade <span className="text-gray-400">(optional)</span></label>
              <input type="text" value={qualityGrade} onChange={(e) => setQualityGrade(e.target.value)}
                placeholder="e.g., Grade A, Premium, Fresh"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Accra, Kumasi"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Availability</label>
              <select value={availability} onChange={(e) => setAvailability(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green bg-white text-sm">
                <option value="In Stock">In Stock</option>
                <option value="Pre-order">Pre-order</option>
                <option value="Seasonal">Seasonal</option>
                <option value="Limited">Limited</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimum Order <span className="text-gray-400">(optional)</span></label>
              <input type="text" value={minimumOrder} onChange={(e) => setMinimumOrder(e.target.value)}
                placeholder="e.g., 10 units"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Harvest Date <span className="text-gray-400">(optional)</span></label>
              <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Photo</label>
            <input type="file" accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB.'); return; }
                setImageFile(file);
                setImagePreview(file ? URL.createObjectURL(file) : null);
              }}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-farm-green/10 file:text-farm-green file:font-semibold hover:file:bg-farm-green/20" />
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Preview" className="mt-2 h-32 rounded-xl object-cover" />
            )}
            <p className="text-xs text-gray-400 mt-1.5">Upload a photo, or paste an image URL below. Uploads are stored securely.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL (optional alternative)</label>
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..." disabled={!!imageFile}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white disabled:opacity-50" />
            <p className="text-xs text-gray-400 mt-1.5">Leave empty to use a placeholder image.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder="Describe your product, quality, harvest date, etc."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white resize-none" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.98]">
              {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</span> : 'Create Listing'}
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
