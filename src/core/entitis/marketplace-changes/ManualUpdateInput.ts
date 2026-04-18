import { MarketplaceName } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';

export type ManualUpdateInput = {
  sku: string;
  marketplace: MarketplaceName;
  valorNuevo: string;
};
