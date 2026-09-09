import { Suspense } from 'react';
import Link from 'next/link';
import MarketContent from './MarketContent';

function MarketLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-farm-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Loading market intelligence...</p>
      </div>
    </main>
  );
}

export default function MarketPage() {
  return (
    <div className="min-h-screen bg-farm-cream">
      {/* Header */}
      <section className="bg-gradient-to-br from-farm-green to-emerald-800 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-emerald-200 mb-4">
            <Link href="/dashboard/farmer" className="hover:text-white transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href="/news" className="hover:text-white transition-colors">News</Link>
            <span>/</span>
            <span>Market Intelligence</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Market Intelligence</h1>
          <p className="text-emerald-100">Real-time commodity prices across Ghanaian markets</p>
        </div>
      </section>

      <Suspense fallback={<MarketLoading />}>
        <MarketContent />
      </Suspense>
    </div>
  );
}
