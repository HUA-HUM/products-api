import { MarketplaceName } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { MarketplaceHttpError } from 'src/core/drivers/repositories/marketplace-api/http/errors/MarketplaceHttpError';

export function buildNotPublishedMarketplaceMessage(sku: string, marketplace: MarketplaceName): string {
  return `SKU=${sku} is not published in marketplace=${marketplace}`;
}

export function isNotPublishedMarketplaceMessage(message?: string): boolean {
  return message?.includes('is not published in marketplace=') ?? false;
}

export function normalizeMarketplacePublicationError(
  error: unknown,
  sku: string,
  marketplace: MarketplaceName
): string {
  if (error instanceof MarketplaceHttpError && error.statusCode === 404) {
    return buildNotPublishedMarketplaceMessage(sku, marketplace);
  }

  return error instanceof Error ? error.message : String(error);
}
