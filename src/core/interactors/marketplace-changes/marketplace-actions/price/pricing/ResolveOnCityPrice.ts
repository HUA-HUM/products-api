import { Inject, Injectable } from '@nestjs/common';
import { IGetProfitabilityRepository } from 'src/core/adapters/repositories/pricing-api/GetProfitability/IGetProfitabilityRepository';
import { resolveRoundedPromotion } from './ResolveRoundedPromotion';

export interface OnCityPriceResolved {
  listPrice: number;
  costPrice: number;
  markup: number;
}

@Injectable()
export class ResolveOnCityPrice {
  constructor(
    @Inject('IGetProfitabilityRepository')
    private readonly profitabilityRepository: IGetProfitabilityRepository
  ) {}

  async resolve(sku: string, precioLista: number): Promise<OnCityPriceResolved> {
    const profitability = await this.profitabilityRepository.execute({
      sku,
      salePrice: Math.round(precioLista),
      salesChannel: 'oncity'
    });

    const roundedPromotion = resolveRoundedPromotion(precioLista, profitability.economics.cost);

    return {
      listPrice: roundedPromotion.listPrice,
      costPrice: roundedPromotion.promoPrice,
      markup: roundedPromotion.discountPercent
    };
  }
}
