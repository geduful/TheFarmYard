'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Listing, Profile, VerificationRequest, PremiumVerificationRequest, 
  Report, Shipment, ReRegistrationRequest, StorageFacility, StorageBooking,
  LearningResource, LearningCategory, FundingOpportunity, FundingApplication, FundingProvider,
  SupplierProfile, SupplyProduct, SupplyOrder } from '@/lib/types';
import { FUNDING_APPLICATION_STATUS_CONFIG, SUPPLIER_VERIFICATION_STATUS_CONFIG, SUPPLY_ORDER_STATUS_CONFIG } from '@/lib/types';
import { formatCurrency, formatShipmentTimestamp, getShipmentProgress } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useToast } from '@/components/ui/Toast';
import { useResolvedFileUrl } from '@/components/StorageImage';

function DocPreview({ url, index }: { url: string; index: number }) {
  const resolved = useResolvedFileUrl(url);
  const looksImage = (u: string) =>
    u.startsWith('data:image') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u);
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
      {!resolved ? (
        <div className="skeleton h-48 rounded-none" />
      ) : looksImage(resolved) || url.startsWith('data:image') ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolved} alt={`Document ${index + 1}`} className="w-full h-auto object-contain max-h-[70vh]" />
      ) : (
        <div className="flex items-center gap-3 p-4">
          <span className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">Document {index + 1}</p>
            <p className="text-xs text-gray-500">Non-image file</p>
          </div>
          <a href={resolved} target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">Open</a>
        </div>
      )}
    </div>
  );
}

function LearningTab({
  resources,
  categories,
  onRefresh,
  showToast,
}: {
  resources: LearningResource[];
  categories: LearningCategory[];
  onRefresh: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const supabase = createClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [editing, setEditing] = useState<LearningResource | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI generation state
  const [showAiGenerate, setShowAiGenerate] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formContentType, setFormContentType] = useState<'article' | 'guide' | 'tutorial' | 'video' | 'checklist' | 'faq'>('article');
  const [formDifficulty, setFormDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [formTags, setFormTags] = useState('');
  const [formStatus, setFormStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formFeaturedImage, setFormFeaturedImage] = useState('');
  const [formAuthorName, setFormAuthorName] = useState('');

  function resetForm() {
    setFormTitle('');
    setFormSummary('');
    setFormContent('');
    setFormCategoryId(null);
    setFormContentType('article');
    setFormDifficulty('beginner');
    setFormTags('');
    setFormStatus('draft');
    setFormFeatured(false);
    setFormFeaturedImage('');
    setFormAuthorName('');
    setEditing(null);
  }

  function openEdit(r: LearningResource) {
    setEditing(r);
    setFormTitle(r.title);
    setFormSummary(r.summary || '');
    setFormContent(r.content);
    setFormCategoryId(r.category_id);
    setFormContentType(r.content_type);
    setFormDifficulty(r.difficulty);
    setFormTags(r.tags.join(', '));
    setFormStatus(r.status);
    setFormFeatured(r.is_featured);
    setFormFeaturedImage(r.featured_image || '');
    setFormAuthorName(r.author_name || '');
    setShowCreate(true);
  }

  async function handleAiGenerate() {
    if (!aiTopic.trim()) {
      showToast('Please enter a topic.', 'error');
      return;
    }
    setAiGenerating(true);
    try {
      const response = await fetch('/api/learning/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, contentType: formContentType }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'AI generation failed.', 'error');
        setAiGenerating(false);
        return;
      }
      // Populate form with AI-generated content
      setFormTitle(data.title || '');
      setFormSummary(data.summary || '');
      setFormContent(data.content || '');
      setFormTags(Array.isArray(data.tags) ? data.tags.join(', ') : '');
      setFormDifficulty(data.difficulty || 'beginner');
      setFormFeaturedImage(data.featuredImage || '');
      setFormAuthorName(data.authorName || '');
      // Match category
      if (data.categoryId) {
        setFormCategoryId(data.categoryId);
      } else if (data.category) {
        const matchedCat = categories.find((c) => c.name.toLowerCase() === data.category.toLowerCase());
        if (matchedCat) setFormCategoryId(matchedCat.id);
      }
      setShowAiGenerate(false);
      setShowCreate(true);
      showToast('AI content generated. Review and publish.', 'success');
    } catch {
      showToast('AI generation failed. Please try again.', 'error');
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleSave() {
    if (!formTitle.trim() || !formContent.trim()) {
      showToast('Title and content are required.', 'error');
      return;
    }
    setSaving(true);
    const slug = formTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const tags = formTags.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = {
      title: formTitle.trim(),
      slug,
      summary: formSummary.trim() || null,
      content: formContent.trim(),
      category_id: formCategoryId,
      content_type: formContentType,
      difficulty: formDifficulty,
      tags,
      status: formStatus,
      is_featured: formFeatured,
      featured_image: formFeaturedImage.trim() || null,
      author_name: formAuthorName.trim() || null,
      reading_time_min: Math.max(1, Math.ceil(formContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length / 200)),
      published_at: formStatus === 'published' ? new Date().toISOString() : null,
    };

    if (editing) {
      const { error } = await supabase.from('learning_resources').update(payload).eq('id', editing.id);
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      showToast('Resource updated.', 'success');
    } else {
      const { error } = await supabase.from('learning_resources').insert(payload);
      if (error) { showToast(error.message, 'error'); setSaving(false); return; }
      showToast('Resource created.', 'success');
    }
    resetForm();
    setShowCreate(false);
    await onRefresh();
    setSaving(false);
  }

  async function handleDeleteResource(id: number) {
    const { error } = await supabase.from('learning_resources').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Resource deleted.', 'success');
    await onRefresh();
  }

  async function handleTogglePublish(r: LearningResource) {
    const newStatus = r.status === 'published' ? 'draft' : 'published';
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'published') update.published_at = new Date().toISOString();
    const { error } = await supabase.from('learning_resources').update(update).eq('id', r.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`Resource ${newStatus === 'published' ? 'published' : 'unpublished'}.`, 'success');
    await onRefresh();
  }

  const filtered = resources.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !r.summary?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const statusCounts = {
    draft: resources.filter((r) => r.status === 'draft').length,
    published: resources.filter((r) => r.status === 'published').length,
    archived: resources.filter((r) => r.status === 'archived').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Learning Resources</h3>
          <p className="text-sm text-gray-500">{resources.length} total resources</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiGenerate(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Generate with AI
          </button>
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="px-4 py-2.5 bg-gradient-to-r from-farm-green to-emerald-green text-white text-sm font-semibold rounded-xl hover:from-farm-green/90 hover:to-emerald-green/90 transition shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Create Manually
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-farm-green/30"
          />
        </div>
        <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-gray-100">
          {(['all', 'draft', 'published', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                statusFilter === s ? 'bg-farm-green text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? `All (${resources.length})` : `${s} (${statusCounts[s]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Resources list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="text-gray-500 font-medium">No resources found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 card-hover">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-gray-900">{r.title}</h4>
                    <StatusBadge type="learning_resource" value={r.status} />
                    {r.is_featured && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Featured</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="capitalize">{r.content_type}</span>
                    <span className="capitalize">{r.difficulty}</span>
                    {r.category && <span>{r.category.name}</span>}
                    <span>{r.reading_time_min} min read</span>
                    <span>{r.view_count} views</span>
                    {r.published_at && <span>Published {new Date(r.published_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTogglePublish(r)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      r.status === 'published'
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {r.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteResource(r.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Generate Modal */}
      {showAiGenerate && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => { setShowAiGenerate(false); setAiTopic(''); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md animate-scale-in">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Generate with AI</h3>
                    <p className="text-sm text-gray-500">AI will create content for you to review</p>
                  </div>
                </div>
                <button onClick={() => { setShowAiGenerate(false); setAiTopic(''); }}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">What should the article be about?</label>
                  <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAiGenerate(); }}
                    placeholder="e.g. How to store maize after harvest"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content type</label>
                  <select value={formContentType} onChange={(e) => setFormContentType(e.target.value as typeof formContentType)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300">
                    <option value="article">Article</option>
                    <option value="guide">Guide</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="checklist">Checklist</option>
                    <option value="faq">FAQ</option>
                  </select>
                </div>
                <p className="text-xs text-gray-400">AI will generate a draft. You can review and edit before publishing.</p>
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button onClick={() => { setShowAiGenerate(false); setAiTopic(''); }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button onClick={handleAiGenerate} disabled={aiGenerating || !aiTopic.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {aiGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {showCreate && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => { setShowCreate(false); resetForm(); }} />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl animate-scale-in">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Resource' : 'Create Resource'}</h3>
                <button onClick={() => { setShowCreate(false); resetForm(); }}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/30" placeholder="Resource title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                  <textarea value={formSummary} onChange={(e) => setFormSummary(e.target.value)} rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/30 resize-none" placeholder="Brief summary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content * (HTML supported)</label>
                  <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={10}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-farm-green/30 resize-y" placeholder="Write your content here. HTML tags are supported for formatting." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select value={formCategoryId ?? ''} onChange={(e) => setFormCategoryId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-farm-green/30">
                      <option value="">No category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                    <select value={formContentType} onChange={(e) => setFormContentType(e.target.value as typeof formContentType)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-farm-green/30">
                      <option value="article">Article</option>
                      <option value="guide">Guide</option>
                      <option value="tutorial">Tutorial</option>
                      <option value="video">Video</option>
                      <option value="checklist">Checklist</option>
                      <option value="faq">FAQ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    <select value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value as typeof formDifficulty)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-farm-green/30">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as typeof formStatus)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-farm-green/30">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                  <input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/30" placeholder="maize, storage, post-harvest" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image URL</label>
                  <input type="text" value={formFeaturedImage} onChange={(e) => setFormFeaturedImage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/30" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Author Name</label>
                  <input type="text" value={formAuthorName} onChange={(e) => setFormAuthorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/30" placeholder="Author display name" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formFeatured} onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-farm-green focus:ring-farm-green/30" />
                  <span className="text-sm font-medium text-gray-700">Featured resource</span>
                </label>
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button onClick={() => { setShowCreate(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-farm-green to-emerald-green text-white text-sm font-semibold rounded-xl hover:from-farm-green/90 hover:to-emerald-green/90 transition shadow-sm disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Update Resource' : 'Create Resource'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NewsTab({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [articles, setArticles] = useState<any[]>([]);
  const [sources, setSources] = useState<{ id: number; name: string; source_type: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [articlesRes, sourcesRes] = await Promise.all([
        supabase.from('news_articles').select('id, title, slug, status, source_name, published_at, is_featured, category:news_categories(name)').order('created_at', { ascending: false }).limit(300),
        supabase.from('news_sources').select('id, name, source_type, status').order('name').limit(100),
      ]);
      setArticles(articlesRes.data || []);
      setSources(sourcesRes.data || []);
      setLoading(false);
    })();
  }, [supabase]);

  const handleApprove = async (id: number) => {
    const { error } = await supabase.from('news_articles').update({ status: 'approved', published_at: new Date().toISOString() }).eq('id', id);
    if (!error) {
      setArticles(prev => prev.map(a => a.id === id ? { ...a, status: 'approved', published_at: new Date().toISOString() } : a));
      showToast('Article approved', 'success');
    }
  };

  const handleReject = async (id: number) => {
    const { error } = await supabase.from('news_articles').update({ status: 'rejected' }).eq('id', id);
    if (!error) {
      setArticles(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
      showToast('Article rejected', 'success');
    }
  };

  const handleToggleFeatured = async (id: number, current: boolean) => {
    const { error } = await supabase.from('news_articles').update({ is_featured: !current }).eq('id', id);
    if (!error) {
      setArticles(prev => prev.map(a => a.id === id ? { ...a, is_featured: !current } : a));
    }
  };

  const handleDeleteSource = async (id: number) => {
    const { error } = await supabase.from('news_sources').delete().eq('id', id);
    if (!error) {
      setSources(prev => prev.filter(s => s.id !== id));
      showToast('Source deleted', 'success');
    }
  };

  const filtered = articles.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColor = (s: string) => {
    const colors: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-blue-100 text-blue-700', published: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700', archived: 'bg-gray-100 text-gray-600' };
    return colors[s] || 'bg-gray-100 text-gray-600';
  };

  const sourceTypeColor = (t: string) => {
    const colors: Record<string, string> = { government: 'bg-blue-100 text-blue-700', research: 'bg-purple-100 text-purple-700', international: 'bg-indigo-100 text-indigo-700', publication: 'bg-amber-100 text-amber-700', market_service: 'bg-emerald-100 text-emerald-700', weather: 'bg-cyan-100 text-cyan-700', news_org: 'bg-rose-100 text-rose-700', ngo: 'bg-teal-100 text-teal-700' };
    return colors[t] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Articles Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900">News Articles ({filtered.length})</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-farm-green focus:border-transparent" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-semibold text-gray-600">Title</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Category</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Source</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{article.title}</span>
                      {article.is_featured && <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">Featured</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{(article.category as { name: string } | null)?.name || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{article.source_name || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(article.status)}`}>{article.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      {article.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(article.id)} className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100">Approve</button>
                          <button onClick={() => handleReject(article.id)} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100">Reject</button>
                        </>
                      )}
                      <button onClick={() => handleToggleFeatured(article.id, article.is_featured)} className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100">
                        {article.is_featured ? 'Unfeature' : 'Feature'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sources Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">News Sources ({sources.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-semibold text-gray-600">Name</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Type</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{source.name}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sourceTypeColor(source.source_type)}`}>{source.source_type.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${source.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{source.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => handleDeleteSource(source.id)} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [premiumRequests, setPremiumRequests] = useState<PremiumVerificationRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [reRegRequests, setReRegRequests] = useState<ReRegistrationRequest[]>([]);
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [storageBookings, setStorageBookings] = useState<StorageBooking[]>([]);
  const [learningResources, setLearningResources] = useState<LearningResource[]>([]);
  const [learningCategories, setLearningCategories] = useState<LearningCategory[]>([]);
  const [fundingProviders, setFundingProviders] = useState<FundingProvider[]>([]);
  const [fundingOpportunities, setFundingOpportunities] = useState<FundingOpportunity[]>([]);
  const [fundingApplications, setFundingApplications] = useState<FundingApplication[]>([]);
  const [supplierProfiles, setSupplierProfiles] = useState<SupplierProfile[]>([]);
  const [supplyProducts, setSupplyProducts] = useState<SupplyProduct[]>([]);
  const [supplyOrders, setSupplyOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<'listings' | 'users' | 'verifications' | 'premium' | 'reports' | 'logistics' | 'reregistrations' | 'storage' | 'learning' | 'news' | 'funding' | 'suppliers'>('listings');
  const [userCategory, setUserCategory] = useState<'all' | 'farmer' | 'buyer'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDocs, setViewingDocs] = useState<VerificationRequest | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (cancelled) return;
      if (!p) { setNoProfile(true); setLoading(false); return; }
      if (p.role !== 'admin') { router.push('/marketplace'); return; }

      // Parallelize all independent queries
      const [listingsRes, usersRes, verifRes, premiumRes, reportsRes, shipmentsRes, reRegRes, facilitiesRes, bookingsRes, learningRes, categoriesRes, providersRes, oppsRes, appsRes, suppliersRes, supplyProdsRes, supplyOrdersRes] = await Promise.all([
        supabase.from('listings').select('*, farmer:profiles!listings_farmer_id_fkey(full_name, farm_location, is_verified)').order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('id, full_name, phone_number, role, is_verified, is_blocked, blocked_warning, verification_tier, farm_location, created_at').neq('role', 'admin').order('created_at', { ascending: false }).limit(500),
        supabase.from('verification_requests').select('*, profile:profiles!verification_requests_profile_id_fkey(full_name, phone_number, farm_location, role)').order('created_at', { ascending: false }).limit(200),
        supabase.from('premium_verification_requests').select('*, profile:profiles!premium_verification_requests_profile_id_fkey(full_name, phone_number, farm_location, role, verification_tier)').order('created_at', { ascending: false }).limit(200),
        supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(full_name, phone_number, role), reported_user:profiles!reports_reported_user_id_fkey(full_name, role)').order('created_at', { ascending: false }).limit(200),
        supabase.from('shipments').select('*').order('created_at', { ascending: false }).limit(300),
        supabase.from('re_registration_requests').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('storage_facilities').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('storage_bookings').select('*, facility:storage_facilities(name, facility_type, location, capacity_unit, price_per_unit), farmer:profiles!storage_bookings_farmer_id_fkey(full_name, phone_number)').order('created_at', { ascending: false }).limit(300),
        supabase.from('learning_resources').select('*, category:learning_categories(name, slug)').order('created_at', { ascending: false }).limit(300),
        supabase.from('learning_categories').select('*').order('display_order').limit(100),
        supabase.from('funding_providers').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('funding_opportunities').select('*, provider:funding_providers(name, verification_status)').order('created_at', { ascending: false }).limit(300),
        supabase.from('funding_applications').select('*, opportunity:funding_opportunities(title, funding_type), farmer:profiles!funding_applications_farmer_id_fkey(full_name, phone_number)').order('created_at', { ascending: false }).limit(500),
        supabase.from('supplier_profiles').select('*, user:profiles!supplier_profiles_user_id_fkey(full_name, phone_number, email)').order('created_at', { ascending: false }).limit(200),
        supabase.from('supply_products').select('*, supplier:supplier_profiles!supply_products_supplier_id_fkey(business_name, verification_status)').order('created_at', { ascending: false }).limit(300),
        supabase.from('supply_orders').select('*, items:supply_order_items(*), supplier:supplier_profiles!supply_orders_supplier_id_fkey(business_name), farmer:profiles!supply_orders_farmer_id_fkey(full_name)').order('created_at', { ascending: false }).limit(500),
      ]);

      if (cancelled) return;
      setListings(listingsRes.data || []);
      setUsers(usersRes.data || []);
      setVerificationRequests(verifRes.data || []);
      setPremiumRequests(premiumRes.data || []);
      setReports(reportsRes.data || []);
      setShipments(shipmentsRes.data || []);
      setReRegRequests(reRegRes.data || []);
      setFacilities(facilitiesRes.data || []);
      setStorageBookings(bookingsRes.data || []);
      setLearningResources(learningRes.data || []);
      setLearningCategories(categoriesRes.data || []);
      setFundingProviders(providersRes.data || []);
      setFundingOpportunities(oppsRes.data || []);
      setFundingApplications(appsRes.data || []);
      setSupplierProfiles(suppliersRes.data || []);
      setSupplyProducts(supplyProdsRes.data || []);
      setSupplyOrders(supplyOrdersRes.data || []);

      if (listingsRes.error) setLoadError(`Listings failed to load: ${listingsRes.error.message}`);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function handleApprove(listingId: number) {
    const supabase = createClient();
    const { error } = await supabase.from('listings').update({ is_approved: true }).eq('id', listingId);
    if (error) { showToast(error.message, 'error'); return; }
    setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, is_approved: true } : l)));
    showToast('Listing approved.', 'success');

    // Notify farmer
    const listing = listings.find((l) => l.id === listingId);
    if (listing) {
      fetch('/api/notifications/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: listing.farmer_id,
          type: 'listing_approved',
          category: 'marketplace',
          title: 'Listing Approved',
          message: `Your listing "${listing.title}" has been approved and is now visible on the marketplace.`,
          priority: 'normal',
          actionUrl: '/marketplace',
          entityType: 'listing',
          entityId: listingId,
        }),
      });
    }
  }

  async function handleReject(listingId: number) {
    const supabase = createClient();
    const { error } = await supabase.from('listings').delete().eq('id', listingId);
    if (error) { showToast(error.message, 'error'); return; }
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    showToast('Listing rejected and removed.', 'success');
  }

  async function handlePromote(listingId: number) {
    const supabase = createClient();
    const { error } = await supabase.from('listings').update({ is_promoted: true, promoted_at: new Date().toISOString() }).eq('id', listingId);
    if (error) { showToast(error.message, 'error'); return; }
    setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, is_promoted: true } : l)));
    showToast('Listing promoted.', 'success');
  }

  async function handleVerify(userId: string) {
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('id', userId);
    if (error) { showToast(error.message, 'error'); return; }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_verified: true } : u)));
    showToast('User verified.', 'success');
  }

  async function handleToggleBlock(userId: string, currentBlocked: boolean) {
    const supabase = createClient();
    const update: Record<string, unknown> = { is_blocked: !currentBlocked };
    if (currentBlocked) {
      update.blocked_warning = 'Your account was recently unblocked by an admin. Please ensure you follow our platform policies to avoid being blocked again.';
    }
    const { error } = await supabase.from('profiles').update(update).eq('id', userId);
    if (error) { showToast(error.message, 'error'); return; }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_blocked: !currentBlocked, blocked_warning: currentBlocked ? (update.blocked_warning as string) : u.blocked_warning } : u)));
    showToast(currentBlocked ? 'User unblocked.' : 'User blocked.', 'success');
  }

  async function handleDeleteUser(userId: string) {
    const supabase = createClient();
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) { showToast(error.message, 'error'); return; }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setConfirmDelete(null);
    showToast('User deleted.', 'success');
  }

  async function handleApproveVerification(requestId: number, profileId: string) {
    const supabase = createClient();
    const { error: profileError } = await supabase.from('profiles').update({ is_verified: true, verification_tier: 'verified' }).eq('id', profileId);
    if (profileError) { showToast(profileError.message, 'error'); return; }
    const { error } = await supabase.from('verification_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', requestId);
    if (error) { showToast(error.message, 'error'); return; }
    setVerificationRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r)));
    setUsers((prev) => prev.map((u) => (u.id === profileId ? { ...u, is_verified: true, verification_tier: 'verified' } : u)));
    showToast('Verification approved.', 'success');

    // Notify user
    fetch('/api/notifications/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profileId,
        type: 'verification_approved',
        category: 'verification',
        title: 'Verification Approved',
        message: 'Your identity verification has been approved. You now have a verified badge.',
        priority: 'high',
        actionUrl: '/dashboard/profile',
        entityType: 'verification_request',
        entityId: requestId,
      }),
    });
  }

  async function handleRejectVerification(requestId: number) {
    const supabase = createClient();
    const { error } = await supabase.from('verification_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', requestId);
    if (error) { showToast(error.message, 'error'); return; }
    setVerificationRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)));
    showToast('Verification rejected.', 'success');

    // Find the profile_id from the request and notify
    const req = verificationRequests.find((r) => r.id === requestId);
    if (req) {
      fetch('/api/notifications/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: req.profile_id,
          type: 'verification_rejected',
          category: 'verification',
          title: 'Verification Not Approved',
          message: 'Your verification request was not approved. Please review and try again.',
          priority: 'normal',
          actionUrl: '/dashboard/profile',
          entityType: 'verification_request',
          entityId: requestId,
        }),
      });
    }
  }

  async function handleUpdateReportStatus(reportId: number, status: 'under_review' | 'resolved' | 'dismissed') {
    const supabase = createClient();
    const { error } = await supabase.from('reports').update({ status, reviewed_at: new Date().toISOString() }).eq('id', reportId);
    if (error) { showToast(error.message, 'error'); return; }
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    showToast(`Report marked as ${status.replace('_', ' ')}.`, 'success');
  }

  async function handleApprovePremium(requestId: number, profileId: string) {
    const supabase = createClient();
    const { error: profileError } = await supabase.from('profiles').update({ verification_tier: 'premium' }).eq('id', profileId);
    if (profileError) { showToast(profileError.message, 'error'); return; }
    const { error } = await supabase.from('premium_verification_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', requestId);
    if (error) { showToast(error.message, 'error'); return; }
    setPremiumRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r)));
    setUsers((prev) => prev.map((u) => (u.id === profileId ? { ...u, verification_tier: 'premium' } : u)));
    showToast('Premium granted.', 'success');

    // Notify user
    fetch('/api/notifications/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profileId,
        type: 'tier_changed',
        category: 'verification',
        title: 'Premium Verification Granted',
        message: 'Congratulations! You have been upgraded to Premium verification tier.',
        priority: 'high',
        actionUrl: '/dashboard/profile',
        entityType: 'premium_verification_request',
        entityId: requestId,
      }),
    });
  }

  async function handleRejectPremium(requestId: number, reason?: string) {
    const supabase = createClient();
    const { error } = await supabase.from('premium_verification_requests').update({ status: 'rejected', rejection_reason: reason || null, reviewed_at: new Date().toISOString() }).eq('id', requestId);
    if (error) { showToast(error.message, 'error'); return; }
    setPremiumRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)));
    showToast('Premium request declined.', 'success');
  }

  async function handleApproveReReg(requestId: number) {
    const supabase = createClient();
    const { error } = await supabase.from('re_registration_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', requestId);
    if (error) { showToast(error.message, 'error'); return; }
    setReRegRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r)));
    showToast('Re-registration approved. The user can now create their account.', 'success');
  }

  async function handleRejectReReg(requestId: number) {
    const supabase = createClient();
    const { error } = await supabase.from('re_registration_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', requestId);
    if (error) { showToast(error.message, 'error'); return; }
    setReRegRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)));
    showToast('Re-registration request declined.', 'success');
  }

  if (loading) return <div className="p-6"><TableSkeleton rows={6} cols={4} /></div>;
  if (noProfile) return <div className="p-6 text-center text-gray-500">Profile not found. Please sign up again or contact support.</div>;

  const pendingListings = listings.filter((l) => !l.is_approved);
  const unverifiedUsers = users.filter((u) => !u.is_verified);
  const blockedUsers = users.filter((u) => u.is_blocked);
  const pendingVerifications = verificationRequests.filter((r) => r.status === 'pending');
  const pendingPremiumRequests = premiumRequests.filter((r) => r.status === 'pending');
  const openReports = reports.filter((r) => r.status === 'open' || r.status === 'under_review');
  const pendingReReg = reRegRequests.filter((r) => r.status === 'pending');

  const statCards = [
    { label: 'Total Listings', value: listings.length, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg> },
    { label: 'Pending Review', value: pendingListings.length, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><circle cx="12" cy="12" r="7" /><path d="M12 8v4l2.5 1.5" /></svg> },
    { label: 'Total Users', value: users.length, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg> },
    { label: 'Open Reports', value: openReports.length, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-farm-green via-farm-green-light to-emerald-green shadow-2xl shadow-farm-green/20">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-emerald-300/10 blur-3xl translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.08),transparent_50%)]" />
          <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        </div>

        <div className="relative px-6 sm:px-10 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Admin Dashboard</h1>
                  <p className="text-sm text-emerald-100/70">Oversee listings, manage farmers, and keep the marketplace thriving</p>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-sm bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse shadow-lg shadow-emerald-400/50" />
              <span className="text-emerald-100/80">Live</span>
              <span className="w-px h-4 bg-white/10" />
              <span className="font-medium text-white">{listings.length + users.length} total items</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:bg-white/15 transition card-hover animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-white/80">
                    {stat.icon}
                  </span>
                </div>
                <p className={`text-xl font-bold text-white tabular-nums ${pendingListings.length === 0 && stat.label === 'Pending Review' ? 'text-white/50' : ''}`}>{stat.value}</p>
                <p className="text-xs text-emerald-100/60 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {loadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl animate-fade-in">
          <strong>Couldn&apos;t load admin data.</strong> {loadError} — check that all Supabase migrations are applied and your account role is <code>admin</code>.
        </div>
      )}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5 p-1 bg-white rounded-xl shadow-sm border border-gray-100 shrink-0">
          {(['listings', 'users', 'verifications', 'premium', 'reports', 'logistics', 'reregistrations', 'storage', 'learning', 'news', 'funding', 'suppliers'] as const).map((tab) => {
            const counts = {
              listings: pendingListings.length,
              users: unverifiedUsers.length + blockedUsers.length,
              verifications: pendingVerifications.length,
              premium: pendingPremiumRequests.length,
              reports: openReports.length,
              logistics: shipments.filter((s) => !['delivery_confirmed', 'cancelled', 'failed'].includes(s.status)).length,
              reregistrations: pendingReReg.length,
              storage: storageBookings.filter((b) => b.status === 'pending').length,
              learning: learningResources.filter((r) => r.status === 'draft').length,
              news: 0,
              funding: fundingApplications.filter((a) => a.status === 'submitted').length,
              suppliers: supplierProfiles.filter((s) => s.verification_status === 'pending').length,
            };
              return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? tab === 'premium'
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-purple-500/20'
                      : tab === 'reports'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-500/20'
                      : 'bg-gradient-to-r from-farm-green to-emerald-green text-white shadow-md shadow-farm-green/20'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}>
                <span className="flex items-center gap-2">
                  {tab === 'listings' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>
                  ) : tab === 'users' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  ) : tab === 'verifications' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ) : tab === 'premium' ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                  ) : tab === 'logistics' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  ) : tab === 'reregistrations' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" /></svg>
                  ) : tab === 'storage' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>
                  ) : tab === 'learning' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" /></svg>
                  ) : tab === 'news' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  )}
                  {tab === 'listings' ? 'Listings' : tab === 'users' ? 'Users' : tab === 'verifications' ? 'Verifications' : tab === 'premium' ? 'Premium' : tab === 'logistics' ? 'Logistics' : tab === 'reregistrations' ? 'Re-registrations' : tab === 'storage' ? 'Storage' : tab === 'learning' ? 'Learning' : tab === 'news' ? 'News' : tab === 'funding' ? 'Funding' : tab === 'suppliers' ? 'Suppliers' : 'Reports'}
                  {counts[tab] > 0 && (
                    <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${
                      activeTab === tab ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {counts[tab]}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Listings Tab */}
      {activeTab === 'listings' && (
        <div className="space-y-3 animate-fade-in">
          {listings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20 card-hover">
              <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>
              </div>
              <p className="text-gray-500 font-medium">No listings yet</p>
              <p className="text-gray-400 text-sm mt-1">When farmers create listings, they&apos;ll appear here.</p>
            </div>
          ) : (
            listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-10 rounded-full shrink-0 ${listing.is_approved ? 'bg-emerald-green shadow-sm shadow-emerald-200' : 'bg-amber-400 shadow-sm shadow-amber-200'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900 truncate">{listing.title}</h4>
                          <StatusBadge type="approval" value={listing.is_approved} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-500 ml-5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-farm-green/10 to-emerald-green/10 flex items-center justify-center">
                          <svg className="w-3 h-3 text-farm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                        </span>
                        {listing.farmer?.full_name}
                      </span>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center">
                          <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </span>
                        {listing.category}
                      </span>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center">
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                        </span>
                        {listing.quantity_available} units
                      </span>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <span className="font-semibold text-farm-green bg-farm-green/5 px-2.5 py-0.5 rounded-lg">{formatCurrency(listing.price_per_unit)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4 sm:ml-0">
                    {!listing.is_approved ? (
                      <>
                        <button onClick={() => handleApprove(listing.id)}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-green to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
                          Approve
                        </button>
                        <button onClick={() => handleReject(listing.id)}
                          className="px-4 py-2 bg-white text-alert-red text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                          Reject
                        </button>
                      </>
                    ) : !listing.is_promoted ? (
                      <button onClick={() => handlePromote(listing.id)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                        Promote
                      </button>
                    ) : (
                      <span className="px-3 py-2 text-xs font-semibold text-amber-600 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                        Promoted
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-3 animate-fade-in">
          {/* Category Sub-Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-white rounded-xl shadow-sm border border-gray-100">
              {(['all', 'farmer', 'buyer'] as const).map((cat) => (
                <button key={cat} onClick={() => { setUserCategory(cat); setSearchQuery(''); }}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    userCategory === cat
                      ? cat === 'farmer'
                        ? 'bg-gradient-to-r from-farm-green to-emerald-green text-white shadow-md'
                        : cat === 'buyer'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                        : 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  <span className="flex items-center gap-2">
                    {cat === 'farmer' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                    ) : cat === 'buyer' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    )}
                    {cat === 'all' ? 'All Users' : cat === 'farmer' ? 'Farmers' : 'Buyers'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input type="text" placeholder={`Search ${userCategory === 'all' ? 'users' : userCategory} by name, email, phone or location...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green transition" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {(() => {
            const filtered = users.filter((u) => {
              if (userCategory !== 'all' && u.role !== userCategory) return false;
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return u.full_name.toLowerCase().includes(q)
                || u.farm_location.toLowerCase().includes(q)
                || (u.phone_number && u.phone_number.includes(q))
                || (u.email && u.email.toLowerCase().includes(q));
            });
            return filtered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16 card-hover">
                <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                </div>
                <p className="text-gray-500 font-medium">No {userCategory === 'all' ? 'users' : userCategory + 's'} found</p>
                <p className="text-gray-400 text-sm mt-1">{searchQuery ? 'Try a different search term.' : `No ${userCategory === 'all' ? 'users' : userCategory + 's'} have registered yet.`}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filtered.map((user) => (
                  <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg ${
                        user.is_blocked
                          ? 'bg-gradient-to-br from-red-400 to-red-500 shadow-red-200'
                          : user.is_verified
                          ? 'bg-gradient-to-br from-emerald-green to-farm-green shadow-emerald-200'
                          : 'bg-gradient-to-br from-gray-300 to-gray-400 shadow-gray-200'
                      }`}>
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">{user.full_name}</h4>
                          <StatusBadge type="verification" value={user.is_verified} />
                          {user.is_blocked && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full border border-red-200">Blocked</span>
                          )}
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border capitalize ${
                            user.role === 'farmer' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                            </span>
                            {user.farm_location}
                          </p>
                          {user.phone_number && (
                            <p className="text-sm text-gray-500 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                              </span>
                              {user.phone_number}
                            </p>
                          )}
                          {user.email && (
                            <p className="text-sm text-gray-500 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                              </span>
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {!user.is_verified && user.role === 'farmer' && (
                          <button onClick={() => handleVerify(user.id)}
                            className="px-4 py-2 bg-gradient-to-r from-farm-green to-emerald-green text-white text-xs font-semibold rounded-lg hover:from-farm-green-light hover:to-emerald-700 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
                            Verify
                          </button>
                        )}
                        <button onClick={() => handleToggleBlock(user.id, user.is_blocked)}
                          className={`px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm active:scale-[0.97] flex items-center gap-1.5 ${
                            user.is_blocked
                              ? 'bg-gradient-to-r from-emerald-green to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
                              : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                          }`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          {user.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                        <button onClick={() => setConfirmDelete(user)}
                          className="px-4 py-2 bg-white text-red-600 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Verifications Tab */}
      {activeTab === 'verifications' && (
        <div className="space-y-3 animate-fade-in">
          {verificationRequests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20 card-hover">
              <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-gray-500 font-medium">No verification requests</p>
              <p className="text-gray-400 text-sm mt-1">When farmers request verification, their documents will appear here.</p>
            </div>
          ) : (
            verificationRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-10 rounded-full shrink-0 ${
                        req.status === 'pending' ? 'bg-amber-400 shadow-sm shadow-amber-200' :
                        req.status === 'approved' ? 'bg-emerald-green shadow-sm shadow-emerald-200' :
                        'bg-red-400 shadow-sm shadow-red-200'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900 truncate">{req.profile?.full_name || 'Unknown User'}</h4>
                          <StatusBadge type="verification" value={req.status === 'approved'} pending={req.status === 'pending'} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-500 ml-5">
                      {req.profile?.farm_location && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                          </span>
                          {req.profile.farm_location}
                        </span>
                      )}
                      {req.profile?.phone_number && (
                        <>
                          <span className="text-gray-300 hidden sm:inline">|</span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                            </span>
                            {req.profile.phone_number}
                          </span>
                        </>
                      )}
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <span className="text-gray-400">Submitted {new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4 sm:ml-0">
                    {req.document_urls && req.document_urls.length > 0 && (
                      <button onClick={() => setViewingDocs(req)}
                        className="px-4 py-2 bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        View Docs
                      </button>
                    )}
                    {req.status === 'pending' && (
                      <>
                        <button onClick={() => handleApproveVerification(req.id, req.profile_id)}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-green to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
                          Approve
                        </button>
                        <button onClick={() => handleRejectVerification(req.id)}
                          className="px-4 py-2 bg-white text-alert-red text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Premium Tab */}
      {activeTab === 'premium' && (
        <div className="space-y-3 animate-fade-in">
          {premiumRequests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20 card-hover">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
              </div>
              <p className="text-gray-500 font-medium">No Premium requests yet</p>
              <p className="text-gray-400 text-sm mt-1">Verified users who meet the activity standards will apply here.</p>
            </div>
          ) : (
            premiumRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-purple-100 p-5 card-hover animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-2 h-10 rounded-full shrink-0 ${
                        req.status === 'pending' ? 'bg-purple-400 shadow-sm shadow-purple-200' :
                        req.status === 'approved' ? 'bg-emerald-green shadow-sm shadow-emerald-200' :
                        'bg-red-400 shadow-sm shadow-red-200'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-gray-900">{req.profile?.full_name || 'Unknown'}</h4>
                          <StatusBadge type="tier" value={req.profile?.verification_tier ?? 'verified'} />
                          {req.status === 'approved' && <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">Approved</span>}
                          {req.status === 'rejected' && <span className="px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 rounded-full border border-red-200">Rejected</span>}
                          {req.status === 'pending' && <span className="px-2 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 rounded-full border border-purple-200 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />Pending</span>}
                        </div>
                        <p className="text-xs text-gray-400 capitalize">{req.profile?.role} · {req.profile?.farm_location}</p>
                      </div>
                    </div>

                    {/* Eligibility snapshot */}
                    <div className="ml-5 flex flex-wrap gap-3 mb-3">
                      <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100">
                        <span className="font-semibold text-gray-800">{req.transaction_count}</span> transactions
                      </span>
                      <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100">
                        <span className="font-semibold text-gray-800">{req.listing_count}</span> listings
                      </span>
                      <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100">
                        <span className="font-semibold text-gray-800">{req.account_age_days}</span> days old
                      </span>
                      <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-400 border border-gray-100">
                        Applied {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {req.message && (
                      <div className="ml-5 p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-800 italic">
                        &ldquo;{req.message}&rdquo;
                      </div>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleApprovePremium(req.id, req.profile_id)}
                        className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-violet-700 hover:to-purple-700 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
                        Grant Premium
                      </button>
                      <button onClick={() => handleRejectPremium(req.id)}
                        className="px-4 py-2 bg-white text-alert-red text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-3 animate-fade-in">
          {reports.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20 card-hover">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              </div>
              <p className="text-gray-500 font-medium">No reports yet</p>
              <p className="text-gray-400 text-sm mt-1">User reports will appear here.</p>
            </div>
          ) : (
            reports.map((report) => {
              const categoryColors: Record<string, string> = {
                fraud: 'bg-red-100 text-red-700 border-red-200',
                delivery_issue: 'bg-purple-100 text-purple-700 border-purple-200',
                listing_issue: 'bg-amber-100 text-amber-700 border-amber-200',
                account_issue: 'bg-blue-100 text-blue-700 border-blue-200',
                other: 'bg-gray-100 text-gray-600 border-gray-200',
              };
              const categoryLabels: Record<string, string> = {
                fraud: 'Fraud / Scam',
                delivery_issue: 'Delivery Issue',
                listing_issue: 'Listing Issue',
                account_issue: 'Account Issue',
                other: 'Other',
              };
              const statusColors: Record<string, string> = {
                open: 'bg-red-50 text-red-700 border-red-200',
                under_review: 'bg-amber-50 text-amber-700 border-amber-200',
                resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                dismissed: 'bg-gray-50 text-gray-500 border-gray-200',
              };
              return (
                <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${categoryColors[report.category]}`}>
                          {categoryLabels[report.category]}
                        </span>
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${statusColors[report.status]}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{report.subject}</h4>
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{report.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>From: <span className="text-gray-600 font-medium">{report.reporter?.full_name}</span> ({report.reporter?.role})</span>
                        {report.reported_user && <span>Against: <span className="text-gray-600 font-medium">{report.reported_user.full_name}</span></span>}
                        {report.transaction_id && <span>Transaction #{report.transaction_id}</span>}
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {(report.status === 'open' || report.status === 'under_review') && (
                      <div className="flex flex-col gap-2 shrink-0">
                        {report.status === 'open' && (
                          <button onClick={() => handleUpdateReportStatus(report.id, 'under_review')}
                            className="px-4 py-2 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200 hover:bg-amber-100 transition shadow-sm active:scale-[0.97]">
                            Mark Under Review
                          </button>
                        )}
                        <button onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-green to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition shadow-sm active:scale-[0.97]">
                          Mark Resolved
                        </button>
                        <button onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                          className="px-4 py-2 bg-white text-gray-500 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition shadow-sm active:scale-[0.97]">
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Logistics Tab */}
      {activeTab === 'logistics' && (
        <div className="space-y-3 animate-fade-in">
          {shipments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20 card-hover">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No shipments yet</p>
              <p className="text-gray-400 text-sm mt-1">Shipments will appear here when farmers dispatch orders.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Logistics Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Shipments', value: shipments.length, color: 'bg-purple-50 text-purple-700' },
                  { label: 'In Transit', value: shipments.filter((s) => ['in_transit', 'out_for_delivery'].includes(s.status)).length, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Delivered', value: shipments.filter((s) => s.status === 'delivered').length, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Issues', value: shipments.filter((s) => ['delivery_issue', 'failed'].includes(s.status)).length, color: 'bg-red-50 text-red-700' },
                ].map((stat, i) => (
                  <div key={i} className={`${stat.color} rounded-xl p-4 border border-gray-100`}>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs opacity-70 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Shipments List */}
              {shipments.map((shipment) => {
                const progress = getShipmentProgress(shipment.status);
                return (
                  <div key={shipment.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full shrink-0 ${
                          shipment.status === 'delivered' ? 'bg-emerald-500' :
                          shipment.status === 'in_transit' ? 'bg-blue-500' :
                          shipment.status === 'delivery_issue' ? 'bg-red-500' :
                          'bg-gray-300'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">Shipment #{shipment.id}</h4>
                            <StatusBadge type="shipment" value={shipment.status} />
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Order #{shipment.escrow_id} · {formatShipmentTimestamp(shipment.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-farm-green rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{progress}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-0.5">Pickup</p>
                        <p className="font-medium text-gray-900 text-xs">{shipment.pickup_location}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-0.5">Destination</p>
                        <p className="font-medium text-gray-900 text-xs">{shipment.destination}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-0.5">Driver</p>
                        <p className="font-medium text-gray-900 text-xs">{shipment.driver_name || '—'} {shipment.driver_phone || ''}</p>
                      </div>
                    </div>

                    {(shipment.logistics_provider_name || shipment.vehicle_license_plate) && (
                      <div className="flex gap-3 text-xs text-gray-500 mt-2">
                        {shipment.logistics_provider_name && <span>Provider: {shipment.logistics_provider_name}</span>}
                        {shipment.vehicle_license_plate && <span>Vehicle: {shipment.vehicle_license_plate}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Re-registrations Tab */}
      {activeTab === 'reregistrations' && (
        <div className="space-y-3 animate-fade-in">
          {reRegRequests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20 card-hover">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                  <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No re-registration requests</p>
              <p className="text-gray-400 text-sm mt-1">When blocked or deleted users request to rejoin, their requests appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reRegRequests.map((req) => {
                const statusColors: Record<string, string> = {
                  pending: 'bg-amber-50 text-amber-700 border-amber-200',
                  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  rejected: 'bg-red-50 text-red-700 border-red-200',
                };
                return (
                  <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-2 h-10 rounded-full shrink-0 ${
                            req.status === 'pending' ? 'bg-amber-400 shadow-sm shadow-amber-200' :
                            req.status === 'approved' ? 'bg-emerald-500 shadow-sm shadow-emerald-200' :
                            'bg-red-400 shadow-sm shadow-red-200'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-gray-900">{req.full_name}</h4>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border capitalize ${statusColors[req.status]}`}>
                                {req.status}
                              </span>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border capitalize ${
                                req.role === 'farmer' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {req.role}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-500 ml-5">
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                            </span>
                            {req.email}
                          </span>
                          <span className="text-gray-300 hidden sm:inline">|</span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                            </span>
                            {req.phone_number}
                          </span>
                          <span className="text-gray-300 hidden sm:inline">|</span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                            </span>
                            {req.farm_location}
                          </span>
                          <span className="text-gray-300 hidden sm:inline">|</span>
                          <span className="text-gray-400">Requested {new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleApproveReReg(req.id)}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-green to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
                            Approve
                          </button>
                          <button onClick={() => handleRejectReReg(req.id)}
                            className="px-4 py-2 bg-white text-alert-red text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50 transition shadow-sm active:scale-[0.97] flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                            Ignore
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Storage Tab */}
      {activeTab === 'storage' && (
        <div className="space-y-6 animate-fade-in">
          {/* Facilities Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Storage Facilities</h3>
            {facilities.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12">
                <p className="text-gray-500 font-medium">No storage facilities registered</p>
                <p className="text-gray-400 text-sm mt-1">Facilities will appear here once added to the platform.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {facilities.map((facility) => {
                  const occupancyPct = facility.total_capacity > 0
                    ? Math.round(((facility.total_capacity - facility.available_capacity) / facility.total_capacity) * 100)
                    : 0;
                  const activeBookings = storageBookings.filter((b) => b.facility_id === facility.id && !['checked_out', 'cancelled', 'expired'].includes(b.status)).length;

                  return (
                    <div key={facility.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 card-hover">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm">{facility.name}</h4>
                        <StatusBadge type="storage_facility" value={facility.status} />
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{facility.location}</p>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Capacity</span>
                        <span className="font-medium text-gray-700">{facility.available_capacity.toLocaleString()} / {facility.total_capacity.toLocaleString()} {facility.capacity_unit}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div className={`h-full rounded-full ${occupancyPct > 90 ? 'bg-red-400' : occupancyPct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                          style={{ width: `${occupancyPct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{activeBookings} active bookings</span>
                        <span className="font-semibold text-farm-green">{formatCurrency(facility.price_per_unit)}/{facility.capacity_unit}/day</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bookings Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Storage Bookings</h3>
            {storageBookings.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12">
                <p className="text-gray-500 font-medium">No bookings yet</p>
                <p className="text-gray-400 text-sm mt-1">Farmer storage bookings will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {storageBookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 card-hover">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-gray-900">{booking.produce_name}</h4>
                          <StatusBadge type="storage_booking" value={booking.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span>{booking.farmer?.full_name}</span>
                          <span>{booking.facility?.name} — {booking.facility?.location}</span>
                          <span>{booking.quantity.toLocaleString()} {booking.quantity_unit}</span>
                          <span>{booking.storage_start} to {booking.storage_end}</span>
                          <span className="font-semibold text-farm-green">{formatCurrency(booking.total_fee)}</span>
                        </div>
                      </div>
                      {booking.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={async () => {
                            await fetch('/api/storage-bookings/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id, newStatus: 'confirmed' }) });
                            setStorageBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: 'confirmed' as const } : b));
                            showToast('Booking confirmed.', 'success');
                          }}
                            className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition">
                            Confirm
                          </button>
                          <button onClick={async () => {
                            await fetch('/api/storage-bookings/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id, newStatus: 'cancelled' }) });
                            setStorageBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: 'cancelled' as const } : b));
                            showToast('Booking cancelled.', 'success');
                          }}
                            className="px-3 py-1.5 bg-white text-red-600 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50 transition">
                            Reject
                          </button>
                        </div>
                      )}
                      {booking.status === 'checked_in' && (
                        <button onClick={async () => {
                          await fetch('/api/storage-bookings/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id, newStatus: 'stored' }) });
                          setStorageBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: 'stored' as const } : b));
                          showToast('Marked as stored.', 'success');
                        }}
                          className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition shrink-0">
                          Mark Stored
                        </button>
                      )}
                      {booking.status === 'stored' && (
                        <button onClick={async () => {
                          await fetch('/api/storage-bookings/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id, newStatus: 'checked_out' }) });
                          setStorageBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: 'checked_out' as const, checked_out_at: new Date().toISOString() } : b));
                          showToast('Marked as checked out.', 'success');
                        }}
                          className="px-3 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 transition shrink-0">
                          Check Out
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Learning Tab */}
      {activeTab === 'learning' && (
        <LearningTab
          resources={learningResources}
          categories={learningCategories}
          onRefresh={async () => {
            const supabase = createClient();
            const { data: lr } = await supabase.from('learning_resources').select('*, category:learning_categories(name, slug)').order('created_at', { ascending: false }).limit(300);
            setLearningResources(lr || []);
          }}
          showToast={showToast}
        />
      )}

      {/* News Tab */}
      {activeTab === 'news' && (
        <NewsTab showToast={showToast} />
      )}

      {/* Funding Tab */}
      {activeTab === 'funding' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Funding Opportunities</h3>
            <span className="text-sm text-gray-500">{fundingOpportunities.length} total</span>
          </div>

          {fundingProviders.length === 0 && fundingOpportunities.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                  <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No funding data yet</p>
              <p className="text-gray-400 text-sm mt-1">Funding providers and opportunities will appear here.</p>
            </div>
          ) : (
            <>
              {/* Providers */}
              {fundingProviders.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Funding Providers ({fundingProviders.length})</h4>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {fundingProviders.map((provider) => (
                      <div key={provider.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-gray-900 text-sm">{provider.name}</h5>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${provider.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : provider.verification_status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                            {provider.verification_status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 capitalize">{provider.provider_type.replace(/_/g, ' ')}</p>
                        {provider.location && <p className="text-xs text-gray-400 mt-1">{provider.location}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Opportunities */}
              {fundingOpportunities.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Opportunities ({fundingOpportunities.length})</h4>
                  <div className="space-y-2">
                    {fundingOpportunities.map((opp) => (
                      <div key={opp.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h5 className="font-semibold text-gray-900 text-sm">{opp.title}</h5>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opp.status === 'open' ? 'bg-emerald-100 text-emerald-700' : opp.status === 'closed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                              {opp.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {typeof opp.provider === 'object' && opp.provider ? opp.provider.name : 'Unknown provider'} · {opp.funding_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatCurrency(opp.min_amount)} – {formatCurrency(opp.max_amount)}
                            {opp.application_deadline && ` · Deadline: ${new Date(opp.application_deadline).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {opp.status === 'draft' && (
                            <button onClick={async () => {
                              await fetch('/api/funding/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunityId: opp.id, newStatus: 'open' }) });
                              setFundingOpportunities((prev) => prev.map((o) => o.id === opp.id ? { ...o, status: 'open' as const } : o));
                            }} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">Open</button>
                          )}
                          {opp.status === 'open' && (
                            <button onClick={async () => {
                              await fetch('/api/funding/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunityId: opp.id, newStatus: 'closed' }) });
                              setFundingOpportunities((prev) => prev.map((o) => o.id === opp.id ? { ...o, status: 'closed' as const } : o));
                            }} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition">Close</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Applications */}
              {fundingApplications.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Applications ({fundingApplications.length})</h4>
                  <div className="space-y-2">
                    {fundingApplications.map((app) => (
                      <div key={app.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h5 className="font-semibold text-gray-900 text-sm">{typeof app.opportunity === 'object' && app.opportunity ? app.opportunity.title : 'Unknown'}</h5>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FUNDING_APPLICATION_STATUS_CONFIG[app.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                              {app.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {typeof app.farmer === 'object' && app.farmer ? app.farmer.full_name : 'Unknown farmer'} · Requested {formatCurrency(app.amount_requested)}
                          </p>
                          <p className="text-xs text-gray-400">Submitted {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {app.status === 'submitted' && (
                            <>
                              <button onClick={async () => {
                                await fetch('/api/funding/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: app.id, newStatus: 'under_review' }) });
                                setFundingApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: 'under_review' as const } : a));
                              }} className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">Review</button>
                            </>
                          )}
                          {app.status === 'under_review' && (
                            <>
                              <button onClick={async () => {
                                await fetch('/api/funding/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: app.id, newStatus: 'approved' }) });
                                setFundingApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: 'approved' as const } : a));
                              }} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">Approve</button>
                              <button onClick={async () => {
                                await fetch('/api/funding/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: app.id, newStatus: 'rejected' }) });
                                setFundingApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: 'rejected' as const } : a));
                              }} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition">Reject</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Supplier Management</h3>
            <span className="text-sm text-gray-500">{supplierProfiles.length} total</span>
          </div>

          {/* Supplier Applications */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Supplier Applications ({supplierProfiles.filter((s) => s.verification_status === 'pending').length} pending)</h4>
            {supplierProfiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 text-center py-12">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>
                </div>
                <p className="text-gray-500 font-medium">No supplier applications yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {supplierProfiles.map((supplier) => {
                  const statusConfig = SUPPLIER_VERIFICATION_STATUS_CONFIG[supplier.verification_status];
                  const user = supplier.user as Record<string, unknown> | undefined;
                  return (
                    <div key={supplier.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h5 className="font-semibold text-gray-900 text-sm">{supplier.business_name}</h5>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig?.color || 'bg-gray-100 text-gray-600'}`}>
                            {statusConfig?.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {user ? String(user.full_name) : 'Unknown'} · {supplier.business_location}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Products: {supplier.total_products} · Orders: {supplier.total_orders} · Rating: {supplier.rating_avg > 0 ? `${supplier.rating_avg.toFixed(1)} (${supplier.rating_count})` : 'N/A'}
                        </p>
                        {supplier.rejection_reason && (
                          <p className="text-xs text-red-500 mt-1">Reason: {supplier.rejection_reason}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        {supplier.verification_status === 'pending' && (
                          <>
                            <button onClick={async () => {
                              await fetch('/api/admin/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplierId: supplier.id, action: 'under_review' }) });
                              setSupplierProfiles((prev) => prev.map((s) => s.id === supplier.id ? { ...s, verification_status: 'under_review' as const } : s));
                            }} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">Review</button>
                            <button onClick={async () => {
                              await fetch('/api/admin/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplierId: supplier.id, action: 'approve' }) });
                              setSupplierProfiles((prev) => prev.map((s) => s.id === supplier.id ? { ...s, verification_status: 'approved' as const, verified_at: new Date().toISOString() } : s));
                            }} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">Approve</button>
                            <button onClick={async () => {
                              const reason = prompt('Rejection reason (optional):');
                              await fetch('/api/admin/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplierId: supplier.id, action: 'reject', reason: reason || undefined }) });
                              setSupplierProfiles((prev) => prev.map((s) => s.id === supplier.id ? { ...s, verification_status: 'rejected' as const, rejection_reason: reason || null } : s));
                            }} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition">Reject</button>
                          </>
                        )}
                        {supplier.verification_status === 'approved' && (
                          <button onClick={async () => {
                            if (!confirm('Suspend this supplier?')) return;
                            await fetch('/api/admin/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplierId: supplier.id, action: 'suspend' }) });
                            setSupplierProfiles((prev) => prev.map((s) => s.id === supplier.id ? { ...s, verification_status: 'suspended' as const } : s));
                          }} className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition">Suspend</button>
                        )}
                        {supplier.verification_status === 'suspended' && (
                          <button onClick={async () => {
                            await fetch('/api/admin/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplierId: supplier.id, action: 'approve' }) });
                            setSupplierProfiles((prev) => prev.map((s) => s.id === supplier.id ? { ...s, verification_status: 'approved' as const } : s));
                          }} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">Reinstate</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Supply Orders */}
          {supplyOrders.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Supply Orders ({supplyOrders.length})</h4>
              <div className="space-y-2">
                {supplyOrders.slice(0, 20).map((order) => {
                  const statusConfig = SUPPLY_ORDER_STATUS_CONFIG[order.status];
                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">{order.order_number}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig?.color || 'bg-gray-100 text-gray-600'}`}>{statusConfig?.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {typeof order.supplier === 'object' && order.supplier ? String(order.supplier.business_name) : 'Supplier'} · {typeof order.farmer === 'object' && order.farmer ? String(order.farmer.full_name) : 'Farmer'} · GH₵ {Number(order.total_amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => setConfirmDelete(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-md animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete User</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to permanently delete <strong>{confirmDelete.full_name}</strong> ({confirmDelete.role})? 
                All their data, listings, and transactions will be removed from the platform.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button onClick={() => handleDeleteUser(confirmDelete.id)}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition shadow-sm flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Document Viewer Drawer */}
      {viewingDocs && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => setViewingDocs(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Verification Documents</h3>
                <p className="text-sm text-gray-500 mt-0.5">{viewingDocs.profile?.full_name}</p>
              </div>
              <button onClick={() => setViewingDocs(null)}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {viewingDocs.document_urls?.map((url, i) => (
                  <DocPreview key={i} url={url} index={i} />
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
              <div className="flex gap-3">
                <button onClick={() => { handleApproveVerification(viewingDocs.id, viewingDocs.profile_id); setViewingDocs(null); }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-green to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition shadow-sm active:scale-[0.97] flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
                  Approve Verification
                </button>
                <button onClick={() => { handleRejectVerification(viewingDocs.id); setViewingDocs(null); }}
                  className="flex-1 px-4 py-2.5 bg-white text-alert-red text-sm font-semibold rounded-xl border border-red-200 hover:bg-red-50 transition shadow-sm active:scale-[0.97] flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                  Reject Verification
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
