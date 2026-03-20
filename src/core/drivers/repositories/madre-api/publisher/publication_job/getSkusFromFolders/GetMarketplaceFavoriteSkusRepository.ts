import {
  IGetMarketplaceFavoriteSkusRepository,
  MarketplaceFavoriteSkusPage
} from 'src/core/adapters/repositories/madre/publisher/publication_job/getSkusFromFolders/IGetMarketplaceFavoriteSkusRepository';
import { MadreHttpClient } from '../../../http/MadreHttpClient';

type GetSkusResponse = {
  data: Array<string | { seller_sku: string | null }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export class GetMarketplaceFavoriteSkusRepository implements IGetMarketplaceFavoriteSkusRepository {
  constructor(private readonly http: MadreHttpClient) {}
  async getSkus(marketplaceId: number, page = 1, limit = 20): Promise<MarketplaceFavoriteSkusPage> {
    const response = await this.http.get<GetSkusResponse>(
      `analytics/marketplace-favorites/${marketplaceId}/favorites`,
      {
        page,
        limit,
        sortOrder: 'desc'
      }
    );

    const items = response.data ?? [];

    return {
      items: items
        .map(item => {
          if (typeof item === 'string') {
            return item;
          }

          return item.seller_sku;
        })
        .filter((sku): sku is string => Boolean(sku)),
      pagination: response.pagination
    };
  }
}
