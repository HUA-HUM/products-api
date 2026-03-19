import { Injectable } from '@nestjs/common';
import { GetMarketplaceFavoriteSkus } from 'src/core/interactors/publisher/publication_job/getSkusFromFolders/GetMarketplaceFavoriteSkus';

@Injectable()
export class GetMarketplaceFavoriteSkusService {
  constructor(private readonly interactor: GetMarketplaceFavoriteSkus) {}

  async execute(marketplaceId: number, page = 1, limit = 50) {
    return this.interactor.execute(marketplaceId, page, limit);
  }
}
