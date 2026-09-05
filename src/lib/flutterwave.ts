/**
 * Server-only Flutterwave client (African collections + payouts).
 * NEVER import from client components — the secret key lives here.
 *
 * Required env: FLW_SECRET_KEY
 * Webhooks:      FLW_WEBHOOK_HASH (the secret hash set in the Flutterwave dashboard)
 */

const FLW_BASE = 'https://api.flutterwave.com/v3';

function secret(): string {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error('Missing FLW_SECRET_KEY');
  return key;
}

/** True when real collections are configured; otherwise checkout runs in demo mode. */
export function isPaymentsConfigured(): boolean {
  return !!process.env.FLW_SECRET_KEY;
}

export interface CollectionArgs {
  txRef: string;
  amount: number;
  currency: string;
  email: string;
  phone?: string;
  name?: string;
  title?: string;
  redirectUrl: string;
}

interface FlwApiResponse {
  status: string;
  message?: string;
  data?: {
    link?: string;
    id?: number;
    status?: string;
    amount?: number;
    currency?: string;
    tx_ref?: string;
  };
}

/** Create a hosted collection page. Buyer is redirected to `link` to pay (MoMo/cards). */
export async function createCollectionPayment(
  args: CollectionArgs
): Promise<{ link: string }> {
  const res = await fetch(`${FLW_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: args.txRef,
      amount: args.amount,
      currency: args.currency,
      redirect_url: args.redirectUrl,
      customer: {
        email: args.email,
        phonenumber: args.phone,
        name: args.name,
      },
      customizations: { title: args.title ?? 'TheFarmYard Escrow Payment' },
    }),
  });
  const json = (await res.json()) as FlwApiResponse;
  if (json.status !== 'success' || !json.data?.link) {
    throw new Error(json.message || 'Failed to start payment.');
  }
  return { link: json.data.link };
}

export interface VerifiedCharge {
  status: string;
  amount: number;
  currency: string;
  txRef: string;
  flwId: number;
}

/** Server-side verification of a charge (source of truth — never trust redirects). */
export async function verifyTransaction(id: number | string): Promise<VerifiedCharge> {
  const res = await fetch(`${FLW_BASE}/transactions/${id}/verify`, {
    headers: { Authorization: `Bearer ${secret()}` },
  });
  const json = (await res.json()) as FlwApiResponse;
  if (json.status !== 'success' || !json.data) {
    throw new Error(json.message || 'Charge verification failed.');
  }
  return {
    status: json.data.status ?? '',
    amount: Number(json.data.amount ?? 0),
    currency: json.data.currency ?? '',
    txRef: json.data.tx_ref ?? '',
    flwId: Number(json.data.id ?? id),
  };
}

export interface TransferArgs {
  amount: number;
  currency: string;
  accountBank: string; // bank code or telco code, e.g. MTN MoMo code
  accountNumber: string; // account no. or MoMo number
  reference: string;
  narration?: string;
}

/** Payout to a farmer (bank or mobile money). Returns the transfer reference. */
export async function initiateTransfer(args: TransferArgs): Promise<{ reference: string }> {
  const res = await fetch(`${FLW_BASE}/transfers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_bank: args.accountBank,
      account_number: args.accountNumber,
      amount: args.amount,
      currency: args.currency,
      reference: args.reference,
      narration: args.narration ?? 'TheFarmYard farmer payout',
    }),
  });
  const json = (await res.json()) as FlwApiResponse & { data?: { reference?: string } };
  if (json.status !== 'success') {
    throw new Error(json.message || 'Payout failed.');
  }
  return { reference: json.data?.reference ?? args.reference };
}
