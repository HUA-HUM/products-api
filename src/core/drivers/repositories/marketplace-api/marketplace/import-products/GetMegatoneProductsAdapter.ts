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
    return this.megatoneRepo.execute(limit, offset);
  }
}
