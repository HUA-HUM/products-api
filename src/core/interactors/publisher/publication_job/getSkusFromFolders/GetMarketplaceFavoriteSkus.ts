import { Inject, Injectable } from '@nestjs/common';
import {
  IGetMarketplaceFavoriteSkusRepository,
  MarketplaceFavoriteSkusPage
} from 'src/core/adapters/repositories/madre/publisher/publication_job/getSkusFromFolders/IGetMarketplaceFavoriteSkusRepository';

@Injectable()
export class GetMarketplaceFavoriteSkus {
  constructor(
    @Inject('IGetMarketplaceFavoriteSkusRepository')
    private readonly repository: IGetMarketplaceFavoriteSkusRepository
  ) {}

  async execute(marketplaceId: number, page = 1, limit = 20): Promise<MarketplaceFavoriteSkusPage> {
    const skus = await this.repository.getSkus(marketplaceId, page, limit);

    return skus;
  }
}
