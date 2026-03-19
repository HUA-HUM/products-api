import { Inject } from '@nestjs/common';
import { IGetFravegaBrandIdRepository } from 'src/core/adapters/repositories/marketplace/fravega/GetBrandId/IGetFravegaBrandIdRepository';

const GENERIC_BRAND_ID = '5a301bdd1400002e004907d2';

export class ResolveFravegaBrand {
  constructor(
    @Inject('IGetFravegaBrandIdRepository')
    private readonly repository: IGetFravegaBrandIdRepository
  ) {}

  async execute(product: { attributes?: { brand?: string } }): Promise<string> {
    const brand = product.attributes?.brand;

    /* ======================================
       SIN MARCA → GENERICO
    ====================================== */
    if (!brand) {
      return GENERIC_BRAND_ID;
    }

    try {
      const response = await this.repository.getByMeliBrand(brand);

      if (!response?.data?.fravega_brand_id) {
        return GENERIC_BRAND_ID;
      }

      return response.data.fravega_brand_id;
    } catch (error) {
      /* ======================================
         ERROR API → GENERICO
      ====================================== */
      return GENERIC_BRAND_ID;
    }
  }
}
