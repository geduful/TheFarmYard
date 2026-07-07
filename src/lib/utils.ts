export function generateDeliveryToken(): string {
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
