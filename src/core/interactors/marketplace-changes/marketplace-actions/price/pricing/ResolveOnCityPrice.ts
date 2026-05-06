import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OnCityPriceResolved {
  listPrice: number;
  costPrice: number;
  markup: number;
}

@Injectable()
export class ResolveOnCityPrice {
  constructor(private readonly config: ConfigService) {}

  resolve(precioLista: number): OnCityPriceResolved {
    const discount = Number(this.config.get<string>('ONCITY_PROMO_DISCOUNT') ?? 15);
    const listPrice = Math.round(precioLista);
    const costPrice = Math.round(listPrice * (1 - discount / 100));

    return { listPrice, costPrice, markup: discount };
  }
}
