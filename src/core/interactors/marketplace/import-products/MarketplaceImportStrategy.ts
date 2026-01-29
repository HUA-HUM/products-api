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
    }[];
    hasNext: boolean;
    nextOffset?: number;
  }>;

  mapStatus(status: string): string;
}
