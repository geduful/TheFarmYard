export function generateDeliveryToken(): string {
  // CSPRNG — Math.random is predictable and must not secure escrow tokens
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return String(100000 + (buf[0] % 900000));
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
  }).format(amount);
}

export function calculateEscrowFees(baseAmount: number) {
  const buyerFee = Math.round(baseAmount * 0.01 * 100) / 100;
  const farmerFee = Math.round(baseAmount * 0.01 * 100) / 100;
  const totalBuyerPaid = baseAmount + buyerFee;
  const totalFarmerYield = baseAmount - farmerFee;
  const platformRevenue = buyerFee + farmerFee;

  return { buyerFee, farmerFee, totalBuyerPaid, totalFarmerYield, platformRevenue };
}
