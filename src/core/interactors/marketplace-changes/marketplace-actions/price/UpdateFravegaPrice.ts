import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IUpdateFravegaPriceRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/update-price/IUpdateFravegaPriceRepository';
import { UpdateFravegaPriceRequest } from 'src/core/entitis/marketplace-api/fravega/products/update-price/UpdateFravegaPriceRequest';
import { ResolveFravegaPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/pricing/ResolveFravegaPrice';

@Injectable()
export class UpdateFravegaPrice {
  constructor(
    private readonly resolvePrice: ResolveFravegaPrice,

    @Inject('IUpdateFravegaPriceRepository')
    private readonly driver: IUpdateFravegaPriceRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();
    console.log(`[MKT-CHANGES] Update fravega price | SKU=${params.sku} | value=${params.valorNuevo}`);

    try {
      const precioLista = Number(params.valorNuevo);

      if (!Number.isFinite(precioLista) || precioLista <= 0) {
        throw new Error(`Invalid valorNuevo: ${params.valorNuevo}`);
      }

      const prices = this.resolvePrice.resolve(precioLista);

      const payload: UpdateFravegaPriceRequest = {
        list: prices.list,
        sale: prices.sale,
        net: prices.net
      };

      console.log(
        `[MKT-CHANGES] Fravega payload | SKU=${params.sku} | refId=${params.sku} | list=${prices.list} | sale=${prices.sale} | net=${prices.net}`
      );

      await this.driver.updateByRefId(params.sku, payload);

      console.log(`[MKT-CHANGES] Fravega response | SKU=${params.sku} | OK`);

      return {
        marketplace: 'fravega',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[MKT-CHANGES] Fravega update FAILED | SKU=${params.sku} | error=${message}`);

      return {
        marketplace: 'fravega',
        status: 'FAILED',
        error: message,
        durationMs: Date.now() - startedAt
      };
    }
  }
}
