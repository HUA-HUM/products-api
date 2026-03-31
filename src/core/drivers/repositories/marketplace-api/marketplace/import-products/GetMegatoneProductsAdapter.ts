import { Injectable, Inject } from '@nestjs/common';
import { IGetMarketplaceProductsRepository } from 'src/core/adapters/repositories/marketplace/marketplace/import-products/IGetMarketplaceProductsRepository';
import { IGetMegatoneProductsRepository } from 'src/core/adapters/repositories/marketplace/megatone/products/get/IGetMegatoneProductsRepository';

@Injectable()
export class GetMegatoneProductsAdapter implements IGetMarketplaceProductsRepository {
  constructor(
    @Inject('IGetMegatoneProductsRepository')
    private readonly megatoneRepo: IGetMegatoneProductsRepository
  ) {}

  async execute(limit: number, offset: number) {
    const response = await this.megatoneRepo.execute(limit, offset);

    return {
      ...response,
      debug: {
        sourceTotal: response.total ?? null,
        sourceLimit: response.limit ?? null,
        sourceOffset: response.offset ?? null,
        sourceCount: response.count ?? null,
        sourceHasNext: response.hasNext ?? null,
        sourceNextOffset: response.nextOffset ?? null
      }
    };
  }
}
