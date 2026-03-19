import { Inject } from '@nestjs/common';
import { IGetMarketplaceFavoriteSkusRepository } from 'src/core/adapters/repositories/madre/publisher/publication_job/getSkusFromFolders/IGetMarketplaceFavoriteSkusRepository';

export class GetMarketplaceFavoriteSkus {
  constructor(
    @Inject('IGetMarketplaceFavoriteSkusRepository')
    private readonly repository: IGetMarketplaceFavoriteSkusRepository
  ) {}

  async execute(marketplaceId: number, page = 1, limit = 20): Promise<string[]> {
    const skus = await this.repository.getSkus(marketplaceId, page, limit);

    return skus;
  }
}
