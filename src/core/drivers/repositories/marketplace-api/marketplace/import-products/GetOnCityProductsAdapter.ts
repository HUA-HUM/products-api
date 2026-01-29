import { Inject, Injectable } from '@nestjs/common';
import { IGetMarketplaceProductsRepository } from 'src/core/adapters/repositories/marketplace/marketplace/import-products/IGetMarketplaceProductsRepository';
import { IGetOncityProductRepository } from 'src/core/adapters/repositories/marketplace/oncity/products/get/IGetOncityProductRepository';

@Injectable()
export class GetOnCityProductsAdapter implements IGetMarketplaceProductsRepository {
  constructor(
    @Inject('IGetOncityProductRepository')
    private readonly onCityRepo: IGetOncityProductRepository
  ) {}
  async execute(limit: number, offset: number) {
    return this.onCityRepo.getAllProduct(limit, offset);
  }
}
