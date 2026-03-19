import { Inject } from '@nestjs/common';
import { IGetFravegaCategoryIdRepository } from 'src/core/adapters/repositories/marketplace/fravega/GetCategoryId/IGetFravegaCategoryIdRepository';

export class ResolveFravegaCategory {
  constructor(
    @Inject('IGetFravegaCategoryIdRepository')
    private readonly repository: IGetFravegaCategoryIdRepository
  ) {}

  async execute(product: { categoryId?: string }): Promise<string | null> {
    if (!product.categoryId) {
      return null;
    }

    try {
      const response = await this.repository.getByMeliCategoryId(product.categoryId);

      if (!response?.fravegaCategoryId) {
        return null;
      }

      return response.fravegaCategoryId;
    } catch (error) {
      return null;
    }
  }
}
