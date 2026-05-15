import { Injectable } from '@nestjs/common';
import { MadreHttpClient } from '../../http/MadreHttpClient';
import {
  IGetIdProductInMarketplacesRepository,
  MarketplaceProductIdsAndSkusResponse
} from 'src/core/adapters/repositories/madre/Sync_items/GetIdProductInMarketplaces/IGetIdProductInMarketplacesRepository';

@Injectable()
export class GetIdProductInMarketplacesRepository implements IGetIdProductInMarketplacesRepository {
  constructor(private readonly httpClient: MadreHttpClient) {}

  async list(params: {
    marketplace: 'fravega' | 'megatone' | 'oncity';
    limit?: number;
    offset?: number;
  }): Promise<MarketplaceProductIdsAndSkusResponse> {
    const { marketplace, limit = 100, offset = 0 } = params;

    if (!marketplace) {
      throw new Error('marketplace is required');
    }

    return this.httpClient.get<MarketplaceProductIdsAndSkusResponse>('/internal/marketplace/products/items/ids-and-skus', {
      marketplace,
      limit,
      offset
    });
  }
}
