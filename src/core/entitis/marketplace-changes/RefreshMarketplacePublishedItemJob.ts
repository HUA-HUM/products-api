import { MarketplaceName } from './MarketplaceActionResult';

export type RefreshMarketplacePublishedItemJobData = {
  runId: string;
  marketplace: MarketplaceName;
  sku: string;
  queuedAt: string;
};
