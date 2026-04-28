import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MegatonePriceResolved {
  precioLista: number;
  precioPromocional: number;
}

@Injectable()
export class ResolveMegatonePrice {
  constructor(private readonly config: ConfigService) {}

  resolve(precioLista: number): MegatonePriceResolved {
    const discount = Number(this.config.get<string>('MEGATONE_PROMO_DISCOUNT') ?? 15);
    const lista = Math.round(precioLista);
    const promo = Math.round(lista * (1 - discount / 100));

    return { precioLista: lista, precioPromocional: promo };
  }
}
