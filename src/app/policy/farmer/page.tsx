import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Farmer Policy - TheFarmYard',
  description: 'Policies, guidelines, and requirements for farmers selling on TheFarmYard marketplace.',
};

const sections = [
  {
    title: '1. Farmer Eligibility & Verification',
    content: `To sell on TheFarmYard, farmers must complete a verification process including providing valid identification, proof of farm location, and contact information. Farmers must be actively engaged in agricultural production. The platform reserves the right to conduct physical inspections. Verification status is displayed on your profile and listings. False information will result in immediate account suspension.`,
  },
  {
    title: '2. Listing Guidelines',
    content: `All listings must be accurate and truthful. Farmers must provide clear product descriptions, real images, correct quantities, and fair pricing. Listings are subject to admin approval before publication. Prohibited listings include: items not in your possession, misrepresented quality or quantity, prohibited or illegal goods, and listings with misleading pricing. Approved listings that receive complaints may be removed pending investigation.`,
  },
  {
    title: '3. Order Fulfillment & Dispatch',
    content: `Once an order is placed and funds are held in escrow, farmers must prepare the goods for dispatch. Use the Dispatch feature to record vehicle license plate, driver phone number, and upload a waybill image. Goods must be dispatched within the timeframe agreed at listing. Failure to dispatch within a reasonable period may result in transaction cancellation and refund to the buyer.`,
  },
  {
    title: '4. Delivery & Token Collection',
    content: `Upon delivery, the farmer must provide the goods to the buyer. The buyer will share a 6-digit delivery token only after inspecting and accepting the goods. Enter this token in the Verify Delivery section to receive payment. Tokens are single-use and expire after the inspection window (based on delivery location, max 48 hours). Do not attempt to obtain tokens through coercion or misrepresentation.`,
  },
  {
    title: '5. Payment & Fee Structure',
    content: `Farmers receive the total_farmer_yield amount after the buyer confirms delivery. A farmer service fee is deducted from the transaction. Fees are calculated as: total_farmer_yield = base_amount - farmer_fee - platform_revenue portion. Payments are processed instantly upon token verification. Auto-release depends on delivery location (max 48 hours) if the buyer does not raise a dispute.`,
  },
  {
    title: '6. Quality Standards',
    content: `Farmers must ensure all goods meet agreed-upon quality standards as described in their listing. Buyers have the right to reject goods that do not match the listing description. Repeated quality issues may result in listing removal, verification revocation, or account suspension. The platform encourages transparent communication about product condition.`,
  },
  {
    title: '7. Disputes & Chargebacks',
    content: `If a buyer disputes a transaction, the farmer must cooperate with the platform's investigation. Provide evidence including photos, communication records, and delivery documentation. Disputes found in favor of the buyer may result in fund refund. Repeated disputes against a farmer will affect their standing and verification status.`,
  },
  {
    title: '8. Account Responsibilities',
    content: `Farmers are responsible for maintaining accurate profile information including farm location, contact details, and availability. Notify the platform of any changes. Keep your account credentials secure. The platform is not liable for unauthorized access due to negligence. Farmers must comply with all applicable tax and business regulations in their jurisdiction.`,
  },
  {
    title: '9. Suspension & Termination',
    content: `TheFarmYard may suspend or terminate farmer accounts for: providing false information, repeated policy violations, fraudulent activity, abuse of the escrow system, harassment of buyers or platform staff, or any illegal activity. Suspended farmers may appeal in writing within 14 days. The platform's decision is final.`,
  },
  {
    title: '10. Support for Farmers',
    content: `Farmers have access to dedicated support through the dashboard. For urgent issues related to payments, disputes, or account access, contact support immediately. We provide guidance on best practices for listing optimization, pricing, and logistics.`,
  },
];

type Props = { searchParams: Promise<{ from?: string }> };

export default async function FarmerPolicy({ searchParams }: Props) {
  const { from } = await searchParams;
  const backHref = from === 'login' ? '/login' : from === 'signup' ? '/signup' : '/';
  const backLabel = from === 'login' ? '← Back to Login' : from === 'signup' ? '← Back to Sign Up' : '← Back to Home';

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-lg font-bold text-farm-green tracking-tight">TheFarmYard</span>
          </Link>
          <Link href={backHref} className="text-sm font-medium text-gray-500 hover:text-farm-green transition">
            {backLabel}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-farm-green uppercase tracking-[0.2em] bg-farm-green/10 px-4 py-1.5 rounded-full">
            Farmer Policy
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-5 mb-4">
            Farmer Policy
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Guidelines and requirements for verified farmers selling on TheFarmYard.
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title} className="animate-fade-in">
              <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
              <p className="text-gray-600 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 p-6 bg-gradient-to-br from-cream to-cream-dark rounded-2xl border border-cream-dark/50 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Last updated: July 2026
          </p>
          <p className="text-sm text-gray-500">
            See also the{' '}
            <Link href="/policy" className="text-farm-green font-semibold hover:underline">Platform Policy</Link>{' '}
            and{' '}
            <Link href="/policy/buyer" className="text-farm-green font-semibold hover:underline">Buyer Policy</Link>.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} TheFarmYard. All rights reserved. Designed and Developed by{' '}
            <a href="https://kpgroupofcompanies.netlify.app/kpmedia.html" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-farm-green transition underline underline-offset-2">
              KP Media
            </a>
        </div>
      </footer>
    </div>
  );
}
