'use client';

import type { EscrowTransaction } from '@/lib/types';
import StatusBadge from './ui/StatusBadge';

interface EscrowTrackerProps {
  transaction: EscrowTransaction;
}

const steps = [
  { key: 'pending_deposit', label: 'Payment Secured' },
  { key: 'held_in_escrow', label: 'Held in Escrow' },
  { key: 'dispatched', label: 'Dispatched via Truck' },
  { key: 'released', label: 'Funds Released' },
];

export default function EscrowTracker({ transaction }: EscrowTrackerProps) {
  const currentStepIndex = steps.findIndex((s) => s.key === transaction.status);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900">Transaction Timeline</h3>
        <StatusBadge type="escrow" value={transaction.status} />
      </div>

      <div className="relative">
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step.key} className="flex items-start gap-4 pb-6 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition ${
                    isCompleted
                      ? 'bg-farm-green text-white'
                      : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-2 ring-farm-green ring-offset-2' : ''}`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : null}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-0.5 h-8 mt-1 ${
                      isCompleted && index < currentStepIndex
                        ? 'bg-farm-green'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
              <div className="pt-1.5">
                <p
                  className={`text-sm font-medium ${
                    isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
                {isCurrent && transaction.status === 'dispatched' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Vehicle: {transaction.vehicle_license_plate || 'N/A'} | Driver:{' '}
                    {transaction.driver_phone_number || 'N/A'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-cream rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">
          <strong className="text-farm-green">Important:</strong> Inspect goods within{' '}
          <strong>2 hours</strong> of delivery. Funds are auto-released based on
          delivery location <strong>(max 48 hours)</strong> if no dispute is raised.
        </p>
      </div>
    </div>
  );
}
