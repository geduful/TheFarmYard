'use client';

import { useState } from 'react';
import type { Shipment, ShipmentStatus, ShipmentStatusHistory } from '@/lib/types';
import { SHIPMENT_STATUS_CONFIG, SHIPMENT_STATUS_FLOW } from '@/lib/types';
import { getShipmentProgress, formatShipmentTimestamp, getEstimatedArrival } from '@/lib/utils';
import StatusBadge from './ui/StatusBadge';

interface ShipmentTrackerProps {
  shipment: Shipment;
  history: ShipmentStatusHistory[];
  userRole: 'farmer' | 'buyer' | 'admin';
  onStatusUpdate?: (newStatus: ShipmentStatus) => void;
}

export default function ShipmentTracker({ shipment, history, userRole, onStatusUpdate }: ShipmentTrackerProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const currentStepIndex = SHIPMENT_STATUS_FLOW.indexOf(shipment.status);
  const progress = getShipmentProgress(shipment.status);

  const availableTransitions = getAvailableTransitions(shipment.status, userRole);

  function getAvailableTransitions(status: ShipmentStatus, role: string): ShipmentStatus[] {
    const transitions: Record<ShipmentStatus, { farmer: ShipmentStatus[]; buyer: ShipmentStatus[]; admin: ShipmentStatus[] }> = {
      pending:            { farmer: ['pickup_scheduled', 'cancelled'], buyer: ['cancelled'], admin: ['pickup_scheduled', 'cancelled', 'failed'] },
      pickup_scheduled:   { farmer: ['assigned', 'cancelled'], buyer: [], admin: ['assigned', 'cancelled', 'failed'] },
      assigned:           { farmer: ['in_transit', 'cancelled'], buyer: [], admin: ['in_transit', 'cancelled', 'failed'] },
      in_transit:         { farmer: ['out_for_delivery', 'delivered'], buyer: ['delivery_issue'], admin: ['out_for_delivery', 'delivered', 'cancelled', 'failed', 'delivery_issue'] },
      out_for_delivery:   { farmer: ['delivered'], buyer: ['delivery_issue'], admin: ['delivered', 'cancelled', 'failed', 'delivery_issue'] },
      delivered:          { farmer: [], buyer: ['delivery_confirmed', 'delivery_issue'], admin: ['delivery_confirmed', 'delivery_issue', 'cancelled', 'failed'] },
      delivery_confirmed: { farmer: [], buyer: [], admin: [] },
      cancelled:          { farmer: [], buyer: [], admin: [] },
      failed:             { farmer: [], buyer: [], admin: [] },
      delivery_issue:     { farmer: ['in_transit', 'out_for_delivery', 'delivered', 'cancelled'], buyer: ['cancelled'], admin: ['in_transit', 'out_for_delivery', 'delivered', 'cancelled'] },
    };
    const roleTransitions = transitions[status];
    if (role === 'farmer') return roleTransitions.farmer;
    if (role === 'buyer') return roleTransitions.buyer;
    if (role === 'admin') return roleTransitions.admin;
    return [];
  }

  async function handleStatusUpdate(newStatus: ShipmentStatus) {
    if (!confirm(`Are you sure you want to change status to "${SHIPMENT_STATUS_CONFIG[newStatus].label}"?`)) return;
    setUpdating(true);
    setError('');

    try {
      const res = await fetch('/api/shipments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: shipment.id, newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
      onStatusUpdate?.(newStatus);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-farm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zm-8-5l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Shipment Tracking
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Order #{shipment.order_id || `#${shipment.id}`}
              {shipment.tracking_number && ` · ${shipment.tracking_number}`}
            </p>
          </div>
          <StatusBadge type="shipment" value={shipment.status} />
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-farm-green rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-right">{progress}% complete</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="space-y-0">
          {SHIPMENT_STATUS_FLOW.map((status, index) => {
            const config = SHIPMENT_STATUS_CONFIG[status];
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const historyEntry = history.find((h) => h.to_status === status);

            return (
              <div key={status} className="flex gap-4">
                {/* Vertical line + dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isCompleted
                        ? 'bg-farm-green text-white'
                        : 'bg-gray-100 text-gray-400'
                    } ${isCurrent ? 'ring-2 ring-farm-green ring-offset-2' : ''}`}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < SHIPMENT_STATUS_FLOW.length - 1 && (
                    <div className={`w-0.5 h-10 ${isCompleted && index < currentStepIndex ? 'bg-farm-green' : 'bg-gray-200'}`} />
                  )}
                </div>

                {/* Content */}
                <div className="pb-6 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {config.label}
                    </p>
                    {historyEntry && (
                      <span className="text-xs text-gray-400">
                        {formatShipmentTimestamp(historyEntry.created_at)}
                      </span>
                    )}
                  </div>
                  {historyEntry?.note && (
                    <p className="text-xs text-gray-500 mt-0.5">{historyEntry.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Details */}
      <div className="px-6 pb-6">
        <div className="bg-cream rounded-lg p-4 border border-gray-200 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Pickup</p>
              <p className="font-medium text-gray-900">{shipment.pickup_location}</p>
            </div>
            <div>
              <p className="text-gray-500">Destination</p>
              <p className="font-medium text-gray-900">{shipment.destination}</p>
            </div>
            {shipment.driver_name && (
              <div>
                <p className="text-gray-500">Driver</p>
                <p className="font-medium text-gray-900">{shipment.driver_name}</p>
              </div>
            )}
            {shipment.vehicle_license_plate && (
              <div>
                <p className="text-gray-500">Vehicle</p>
                <p className="font-medium text-gray-900">{shipment.vehicle_license_plate}</p>
              </div>
            )}
            {shipment.logistics_provider_name && (
              <div>
                <p className="text-gray-500">Provider</p>
                <p className="font-medium text-gray-900">{shipment.logistics_provider_name}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Estimated Arrival</p>
              <p className="font-medium text-gray-900">{getEstimatedArrival(shipment.estimated_delivery_at)}</p>
            </div>
          </div>
          {shipment.delivery_notes && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">Notes</p>
              <p className="text-sm text-gray-700">{shipment.delivery_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Actions */}
      {availableTransitions.length > 0 && (
        <div className="px-6 pb-6">
          <p className="text-xs text-gray-500 mb-2">Update Status</p>
          <div className="flex flex-wrap gap-2">
            {availableTransitions.map((nextStatus) => {
              const cfg = SHIPMENT_STATUS_CONFIG[nextStatus];
              const isDanger = ['cancelled', 'failed', 'delivery_issue'].includes(nextStatus);
              return (
                <button
                  key={nextStatus}
                  onClick={() => handleStatusUpdate(nextStatus)}
                  disabled={updating}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    isDanger
                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      : 'bg-farm-green/5 text-farm-green border-farm-green/20 hover:bg-farm-green/10'
                  } disabled:opacity-50`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-2">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
