import { Inject } from '@nestjs/common';
import { IGetMadreProductsRepository } from 'src/core/adapters/repositories/madre/products/get/IGetMadreProductsRepository';

export class GetMadreProduct {
  constructor(
    @Inject('IGetMadreProductsRepository')
    private readonly repository: IGetMadreProductsRepository
  ) {}

  async execute(sku: string) {
    const product = await this.repository.getBySku(sku);

    if (!product) {
      throw new Error(`PRODUCT_NOT_FOUND: ${sku}`);
    }

    return product;
  }
}
