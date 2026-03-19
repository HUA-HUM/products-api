import { Inject } from '@nestjs/common';
import { IGetCategoryIdRepository } from 'src/core/adapters/repositories/marketplace/megatone/GetCategoryId/IGetCategoryIdRepository';

export class ResolveMegatoneCategory {
  constructor(
    @Inject('IGetCategoryIdRepository')
    private readonly repository: IGetCategoryIdRepository
  ) {}

  async execute(product: { categoryId: string; sku: string }): Promise<number | null> {
    if (!product.categoryId) {
      return null;
    }

    const response = await this.repository.getByMeliCategoryId(product.categoryId);

    if (!response?.megatoneCategoryId) {
      return null;
    }

    return Number(response.megatoneCategoryId);
  }
}
