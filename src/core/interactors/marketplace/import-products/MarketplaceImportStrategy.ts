import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';

export interface MarketplaceImportStrategy {
  marketplace: ProductSyncMarketplace;

  getProducts(
    limit: number,
    offset: number
  ): Promise<{
    items: {
      publicationId: number | string;
      sellerSku: string;
      marketSku?: string | null;
      price: number;
      stock: number;
      status: string;
      raw?: unknown;
    }[];
    hasNext: boolean;
    nextOffset?: number;
    debug?: Record<string, unknown>;
  }>;

  mapStatus(status: string): string;
}
