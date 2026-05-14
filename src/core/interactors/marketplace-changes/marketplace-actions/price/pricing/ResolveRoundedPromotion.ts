export type RoundedPromotion = {
  listPrice: number;
  promoPrice: number;
  discountPercent: number;
};

export function resolveRoundedPromotion(listPrice: number, minimumPromoPrice: number): RoundedPromotion {
  const normalizedOriginalListPrice = Math.round(listPrice);
  const normalizedMinimumPromoPrice = Math.floor(minimumPromoPrice) + 1;

  if (!Number.isFinite(normalizedOriginalListPrice) || normalizedOriginalListPrice <= 0) {
    throw new Error(`Invalid listPrice: ${listPrice}`);
  }

  if (!Number.isFinite(normalizedMinimumPromoPrice) || normalizedMinimumPromoPrice <= 0) {
    throw new Error(`Invalid minimumPromoPrice: ${minimumPromoPrice}`);
  }

  const normalizedListPrice =
    normalizedMinimumPromoPrice >= normalizedOriginalListPrice
      ? Math.ceil(normalizedMinimumPromoPrice * 1.1)
      : normalizedOriginalListPrice;

  const rawDiscountPercent = ((normalizedListPrice - normalizedMinimumPromoPrice) / normalizedListPrice) * 100;

  for (let discountPercent = Math.floor(rawDiscountPercent); discountPercent >= 0; discountPercent--) {
    const promoPrice = Math.round(normalizedListPrice * (1 - discountPercent / 100));

    if (promoPrice >= normalizedMinimumPromoPrice && promoPrice <= normalizedListPrice) {
      return {
        listPrice: normalizedListPrice,
        promoPrice,
        discountPercent
      };
    }
  }

  return {
    listPrice: normalizedListPrice,
    promoPrice: normalizedListPrice,
    discountPercent: 0
  };
}
