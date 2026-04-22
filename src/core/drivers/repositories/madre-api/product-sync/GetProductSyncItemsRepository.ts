import { Injectable } from '@nestjs/common';
import { MadreHttpClient } from '../http/MadreHttpClient';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';

export interface ProductSyncItemDto {
  id: string;
  seller_sku: string;
  external_id: string;
  price: number;
  stock: number;
  status: string;
  last_seen_at: string;
}

export interface PaginatedSyncItemsResponse {
  items: ProductSyncItemDto[];
  limit: number;
  offset: number;
  count: number;
  total: number;
  hasNext: boolean;
  nextOffset: number | null;
}

export type MarketplaceName = 'megatone' | 'oncity' | 'fravega';

export interface MarketplaceSnapshotItem {
  marketplace: MarketplaceName;
  marketplaceSku: string;
  externalId: string;
  price: number;
  stock: number;
  status: string;
  isActive: boolean;
  lastSeenAt: string;
  updatedAt: string;
}

export interface MarketplaceSnapshotResponse {
  sellerSku: string;
  marketplaces: MarketplaceName[];
  priceByMarketplace: Record<string, number>;
  stockByMarketplace: Record<string, number>;
  statusByMarketplace: Record<string, string>;
  items: MarketplaceSnapshotItem[];
}

@Injectable()
export class GetProductSyncItemsRepository implements IGetProductSyncItemsRepository {
  constructor(private readonly httpClient: MadreHttpClient) {}

  async listAll(marketplace: string, limit = 100, offset = 0): Promise<PaginatedSyncItemsResponse> {
    return this.httpClient.get<PaginatedSyncItemsResponse>('/internal/marketplace/products/items/all', {
      marketplace,
      limit,
      offset
    });
  }

  async getBySellerSku(sellerSku: string): Promise<any> {
    if (!sellerSku) {
      throw new Error('sellerSku is required');
    }

    return this.httpClient.get<any>(`/internal/marketplace/products/${sellerSku}`);
  }

  async getBySellerSkuAndMarketplace(
    sellerSku: string,
    marketplace: MarketplaceName
  ): Promise<MarketplaceSnapshotItem | null> {
    if (!sellerSku) {
      throw new Error('sellerSku is required');
    }

    const response = await this.httpClient.get<MarketplaceSnapshotResponse>(
      `/internal/marketplace/products/items/${encodeURIComponent(sellerSku)}/marketplaces`
    );

    return response.items.find(i => i.marketplace === marketplace) ?? null;
  }
}
