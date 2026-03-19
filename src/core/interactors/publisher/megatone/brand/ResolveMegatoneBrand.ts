import { Inject } from '@nestjs/common';
import { IGetBrandIdRepository } from 'src/core/adapters/repositories/marketplace/megatone/GetBrandId/IGetBrandIdRepository';

const GENERIC_BRAND_ID = 1119;

export class ResolveMegatoneBrand {
  constructor(
    @Inject('IGetBrandIdRepository')
    private readonly repository: IGetBrandIdRepository
  ) {}

  async execute(brand: string | undefined): Promise<number> {
    if (!brand) {
      return GENERIC_BRAND_ID;
    }

    try {
      const response = await this.repository.getByMeliBrand(brand);

      if (!response?.data?.megatone_brand_id) {
        return GENERIC_BRAND_ID;
      }

      return Number(response.data.megatone_brand_id);
    } catch {
      return GENERIC_BRAND_ID;
    }
  }
}
