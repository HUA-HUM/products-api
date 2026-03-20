import { IGetMarketplaceFavoriteSkusRepository } from 'src/core/adapters/repositories/madre/publisher/publication_job/getSkusFromFolders/IGetMarketplaceFavoriteSkusRepository';
import { MadreHttpClient } from '../../../http/MadreHttpClient';

type GetSkusResponse = {
  data: { seller_sku: string | null }[];
};

export class GetMarketplaceFavoriteSkusRepository implements IGetMarketplaceFavoriteSkusRepository {
  constructor(private readonly http: MadreHttpClient) {}
  async getSkus(marketplaceId: number, page = 1, limit = 20): Promise<string[]> {
    const response = await this.http.get<GetSkusResponse>(
      `analytics/marketplace-favorites/${marketplaceId}/favorites`,
      {
        params: {
          page,
          limit,
          sortOrder: 'desc'
        }
      }
    );

    const items = response.data ?? [];

    return items.map(item => item.seller_sku).filter((sku): sku is string => sku !== null);
  }
}
