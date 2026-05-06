import { Inject, Injectable } from '@nestjs/common';
import { IGetOnCityBrandsRepository } from 'src/core/adapters/repositories/marketplace/oncity/GetBrand/IGetOnCityBrandsRepository';
import { IMatchOnCityBrandRepository } from 'src/core/adapters/repositories/openAi/IMatchOnCityBrandRepository';

@Injectable()
export class ResolveOnCityBrand {
  constructor(
    @Inject('IGetOnCityBrandsRepository')
    private readonly repository: IGetOnCityBrandsRepository,

    @Inject('IMatchOnCityBrandRepository')
    private readonly matchRepository: IMatchOnCityBrandRepository
  ) {}

  async execute(product: { attributes?: { brand?: string } }): Promise<string | null> {
    const brand = product.attributes?.brand?.trim();

    if (!brand) {
      return null;
    }

    try {
      const exactMatch = await this.repository.findByName(brand);

      if (exactMatch) {
        return String(exactMatch.id);
      }

      const brands = await this.repository.getAll();
      return await this.matchRepository.match({
        brand,
        candidates: brands
      });
    } catch {
      return null;
    }
  }
}
