import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Buyer Policy - TheFarmYard',
  description: 'Policies, protections, and guidelines for buyers purchasing on TheFarmYard marketplace.',
};

const sections = [
  {
    title: '1. Buyer Eligibility',
    content: `Anyone aged 18 or older with a valid account may purchase on TheFarmYard. Buyers must provide accurate registration information including full name, phone number, and delivery region. The platform reserves the right to verify buyer identity for high-value transactions. Accounts found to be fraudulent will be terminated immediately.`,
  },
  {
    title: '2. Escrow Protection',
    content: `When you purchase through TheFarmYard, your payment is held securely in escrow. Funds are not released to the farmer until you confirm delivery by sharing your unique 6-digit delivery token. This ensures you only pay for goods you have received and accepted. The buyer protection fee (1% of base amount) covers this service and dispute resolution.`,
  },
  {
    title: '3. Making a Purchase',
    content: `Browse the marketplace, select a listing, and proceed to checkout. You will pay the total amount including the base price plus buyer protection fee. Upon payment, a delivery token is generated. Save this token securely — it is your proof of purchase and the key to releasing funds only when you are satisfied.`,
  },
  {
    title: '4. Delivery & Inspection',
    content: `Coordinate delivery with the farmer after purchase. When goods arrive, inspect them thoroughly before sharing your delivery token. Check quantity, quality, and condition against the listing description. Only share the token once you are fully satisfied. Once the token is entered by the farmer, funds are released and the transaction is complete.`,
  },
  {
    title: '5. Inspection Period & Auto-Release',
    content: `You have up to 2 hours from delivery to inspect goods. If no dispute is raised within the inspection window (based on delivery location, max 48 hours), funds may be auto-released to the farmer. It is your responsibility to inspect goods promptly and raise any concerns before the auto-release period expires.`,
  },
  {
    title: '6. Disputes & Refunds',
    content: `If goods do not match the listing description, are damaged, or are of unacceptable quality, raise a dispute immediately through your dashboard. Provide evidence such as photos and communication records. The platform will investigate and may issue a full or partial refund. Disputes must be raised within the inspection window (based on delivery location, max 48 hours). Refunds are processed back to the original payment method.`,
  },
  {
    title: '7. Cancellation Policy',
    content: `Buyers may cancel an order before it is dispatched by the farmer. Once dispatched, cancellation is subject to the farmer's agreement and platform review. Unilateral cancellation after dispatch may result in fees. The platform reserves the right to cancel transactions that violate policy.`,
  },
  {
    title: '8. Buyer Responsibilities',
    content: `Buyers must act in good faith. Do not request delivery tokens without actually receiving goods. False dispute claims or attempts to defraud farmers will result in account suspension. Provide accurate delivery information and be available to receive goods at the agreed time.`,
  },
  {
    title: '9. Prohibited Buyer Conduct',
    content: `Buyers may not: harass or threaten farmers, attempt to transact outside the platform escrow system, create multiple accounts, submit false disputes, or engage in any fraudulent activity. Violations will result in account termination and possible legal action.`,
  },
  {
    title: '10. Support for Buyers',
    content: `For questions about orders, disputes, or platform usage, contact support through your dashboard. Our team is available to assist with any issues. For urgent matters related to delivery or disputes, please reach out as soon as possible.`,
  },
];

type Props = { searchParams: Promise<{ from?: string }> };

export default async function BuyerPolicy({ searchParams }: Props) {
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
            Buyer Policy
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-5 mb-4">
            Buyer Policy
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Your rights, protections, and responsibilities when buying on TheFarmYard.
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
            <Link href="/policy/farmer" className="text-farm-green font-semibold hover:underline">Farmer Policy</Link>.
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
