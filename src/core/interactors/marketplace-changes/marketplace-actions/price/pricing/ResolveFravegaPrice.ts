import { Inject, Injectable } from '@nestjs/common';
import { IGetProfitabilityRepository } from 'src/core/adapters/repositories/pricing-api/GetProfitability/IGetProfitabilityRepository';
import { resolveRoundedPromotion } from './ResolveRoundedPromotion';

export interface FravegaPriceResolved {
  list: number;
  sale: number;
  net: number;
  discountPercent: number;
}

const IVA_RATE = 21;

@Injectable()
export class ResolveFravegaPrice {
  constructor(
    @Inject('IGetProfitabilityRepository')
    private readonly profitabilityRepository: IGetProfitabilityRepository
  ) {}

  async resolve(sku: string, precioLista: number): Promise<FravegaPriceResolved> {
    const profitability = await this.profitabilityRepository.execute({
      sku,
      salePrice: Math.round(precioLista),
      salesChannel: 'fravega'
    });

    const roundedPromotion = resolveRoundedPromotion(precioLista, profitability.economics.cost);
    const sale = roundedPromotion.promoPrice;
    const net = Math.round(sale / (1 + IVA_RATE / 100));

    return {
      list: roundedPromotion.listPrice,
      sale,
      net,
      discountPercent: roundedPromotion.discountPercent
    };
  }
}
