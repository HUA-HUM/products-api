import { Inject, Injectable } from '@nestjs/common';
import { IGetProfitabilityRepository } from 'src/core/adapters/repositories/pricing-api/GetProfitability/IGetProfitabilityRepository';
import { resolveRoundedPromotion } from './ResolveRoundedPromotion';

export interface MegatonePriceResolved {
  precioLista: number;
  precioPromocional: number;
  porcentajeDescuento: number;
}

@Injectable()
export class ResolveMegatonePrice {
  constructor(
    @Inject('IGetProfitabilityRepository')
    private readonly profitabilityRepository: IGetProfitabilityRepository
  ) {}

  async resolve(sku: string, precioLista: number): Promise<MegatonePriceResolved> {
    const profitability = await this.profitabilityRepository.execute({
      sku,
      salePrice: Math.round(precioLista),
      salesChannel: 'megatone'
    });

    if (profitability.status.profitable === false) {
      const list = Math.round(precioLista);

      return {
        precioLista: list,
        precioPromocional: list,
        porcentajeDescuento: 0
      };
    }

    const roundedPromotion = resolveRoundedPromotion(precioLista, profitability.economics.cost);

    return {
      precioLista: roundedPromotion.listPrice,
      precioPromocional: roundedPromotion.promoPrice,
      porcentajeDescuento: roundedPromotion.discountPercent
    };
  }
}
