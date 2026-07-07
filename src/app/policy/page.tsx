import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Policy - TheFarmYard',
  description: 'TheFarmYard platform policy, terms of service, privacy policy, and platform-wide rules governing all users.',
};

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using TheFarmYard platform, you agree to be bound by this Platform Policy. If you do not agree, you must not use our services. We reserve the right to update these terms at any time, and continued use constitutes acceptance of changes.`,
  },
  {
    title: '2. Platform Overview',
    content: `TheFarmYard is an agricultural marketplace connecting verified farmers directly to buyers. We facilitate secure transactions through an escrow system, provide delivery tracking, and ensure quality control through admin-approved listings. The platform operates across multiple agricultural sectors including crops & grains, livestock, poultry, and aquaculture.`,
  },
  {
    title: '3. User Eligibility & Verification',
    content: `All users must create an account with accurate information. Farmers undergo a verification process before listing goods. The platform reserves the right to reject, suspend, or terminate any account for violations of policy, fraudulent activity, or any conduct deemed harmful to the community. Users must be at least 18 years old to use the platform.`,
  },
  {
    title: '4. Escrow & Payment Policy',
    content: `All financial transactions on TheFarmYard are processed through our secure escrow system. Buyer payments are held in escrow until delivery is confirmed via a 6-digit delivery token. Platform fees apply as disclosed at checkout. Funds are released to the farmer upon successful delivery confirmation or automatically based on delivery location (max 48 hours) if no dispute is raised. The platform charges a buyer protection fee (1%) and a farmer service fee.`,
  },
  {
    title: '5. Dispute Resolution',
    content: `In the event of a dispute between a farmer and a buyer, TheFarmYard will mediate to reach a fair resolution. Disputes must be raised within the inspection window (based on delivery location, max 48 hours). The platform reserves the right to release, refund, or hold funds based on evidence provided by both parties. Our decision is final and binding.`,
  },
  {
    title: '6. Fees & Revenue',
    content: `TheFarmYard generates revenue through transaction fees. Buyer fees and farmer fees are clearly displayed before each transaction is completed. We do not charge listing fees or subscription fees. All fees are non-refundable except in cases where the platform determines a full refund is warranted.`,
  },
  {
    title: '7. Prohibited Activities',
    content: `Users may not engage in fraudulent transactions, misrepresentation of goods, listing of prohibited items (including illegal substances, counterfeit goods, or unsafe products), circumvention of the escrow system, harassment of other users, or any activity that violates applicable laws. Violations will result in immediate account termination and possible legal action.`,
  },
  {
    title: '8. Data Privacy & Security',
    content: `We collect and process user data in accordance with applicable privacy laws. Personal information is used solely for platform operations and will not be shared with third parties without consent. We implement industry-standard security measures to protect user data and transaction information. Users are responsible for maintaining the confidentiality of their account credentials.`,
  },
  {
    title: '9. Intellectual Property',
    content: `TheFarmYard name, logo, and platform design are proprietary. Users retain ownership of content they post but grant the platform a license to display such content for operational purposes.`,
  },
  {
    title: '10. Limitation of Liability',
    content: `TheFarmYard acts as an intermediary platform and is not liable for the quality, safety, or legality of goods listed by farmers. We do not guarantee transaction outcomes. Our liability is limited to the fees paid for the specific transaction in question.`,
  },
  {
    title: '11. Contact & Support',
    content: `For questions regarding this policy or to raise concerns, please contact our support team through the platform. We aim to respond to all inquiries promptly.`,
  },
];

type Props = { searchParams: Promise<{ from?: string }> };

export default async function PlatformPolicy({ searchParams }: Props) {
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
            Policy
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-5 mb-4">
            Platform Policy
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            The governing terms, conditions, and guidelines that apply to all users of TheFarmYard marketplace.
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
            For additional user-specific policies, see our{' '}
            <Link href="/policy/farmer" className="text-farm-green font-semibold hover:underline">Farmer Policy</Link>{' '}
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
