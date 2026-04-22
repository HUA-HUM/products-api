import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FravegaPriceResolved {
  list: number;
  sale: number;
  net: number;
}

const IVA_RATE = 21;

@Injectable()
export class ResolveFravegaPrice {
  constructor(private readonly config: ConfigService) {}

  resolve(precioLista: number): FravegaPriceResolved {
    const discount = Number(this.config.get<string>('FRAVEGA_PROMO_DISCOUNT') ?? 15);
    const list = Math.round(precioLista);
    const sale = Math.round(list * (1 - discount / 100));
    const net = Math.round(sale / (1 + IVA_RATE / 100));

    return { list, sale, net };
  }
}
