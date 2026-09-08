'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Listing } from '@/lib/types';
import { formatCurrency, formatPriceUnit } from '@/lib/utils';
import StatusBadge from './ui/StatusBadge';

interface ListingCardProps {
  listing: Listing;
  showActions?: boolean;
  onBuy?: (listing: Listing) => void;
}

export default function ListingCard({ listing, showActions, onBuy }: ListingCardProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition relative">
      {listing.is_promoted && (
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
            Featured
          </span>
        </div>
      )}
      <div
        className="aspect-[4/3] bg-gray-100 relative overflow-hidden cursor-pointer"
        onClick={() => router.push(`/marketplace/${listing.id}`)}
      >
        {listing.image_url ? (
          <Image
            src={listing.image_url}
            alt={listing.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge type="approval" value={listing.is_approved} />
        </div>
        {listing.farmer?.is_verified && (
          <div className="absolute top-2 right-2">
            <StatusBadge type="verification" value={true} />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-farm-green bg-farm-green/10 px-2 py-0.5 rounded-full">
            {listing.category}
          </span>
        </div>
        <h3
          className="font-semibold text-lg text-gray-900 mb-1 cursor-pointer hover:text-farm-green transition"
          onClick={() => router.push(`/marketplace/${listing.id}`)}
        >
          {listing.title}
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {listing.location || listing.farmer?.farm_location}
        </p>

        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-lg font-bold text-farm-green">
              {formatCurrency(listing.price_per_unit)}
            </span>
            <span className="text-sm text-gray-400">{formatPriceUnit(listing.price_unit || 'unit')}</span>
          </div>
          <span className="text-sm text-gray-500">{listing.quantity_available}</span>
        </div>

        {listing.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{listing.description}</p>
        )}

        {showActions && onBuy && (
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/marketplace/${listing.id}`)}
              className="flex-1 py-2 border border-farm-green text-farm-green font-medium rounded-lg hover:bg-farm-green/5 transition text-sm"
            >
              View Details
            </button>
            <button
              onClick={() => onBuy(listing)}
              className="flex-1 py-2 bg-farm-green text-white font-medium rounded-lg hover:bg-farm-green-light transition text-sm"
            >
              Buy Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
