import { Injectable } from '@nestjs/common';

export type OnCityPublishPrices = {
  listPrice: number;
  costPrice: number;
  markup: number;
};

@Injectable()
export class ResolveOnCityPrices {
  execute(price: number): OnCityPublishPrices {
    if (!price || price <= 0) {
      throw new Error('INVALID_PRICE');
    }

    const discount = Number(process.env.ONCITY_PROMO_DISCOUNT ?? 15);
    const listPrice = Math.round(price);
    const costPrice = Math.round(listPrice * (1 - discount / 100));

    return {
      listPrice,
      costPrice,
      markup: discount
    };
  }
}
