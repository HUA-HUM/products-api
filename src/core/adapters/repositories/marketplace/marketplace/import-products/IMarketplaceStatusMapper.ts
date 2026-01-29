import { ProductSyncStatus } from 'src/core/entitis/madre-api/product-sync/ProductSyncStatus';

export interface IMarketplaceStatusMapper {
  map(status: string): ProductSyncStatus;
}
