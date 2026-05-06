import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IUpdateFravegaPriceRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/update-price/IUpdateFravegaPriceRepository';
import { UpdateFravegaPriceRequest } from 'src/core/entitis/marketplace-api/fravega/products/update-price/UpdateFravegaPriceRequest';
import { ResolveFravegaPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/pricing/ResolveFravegaPrice';
import {
  buildNotPublishedMarketplaceMessage,
  isNotPublishedMarketplaceMessage,
  normalizeMarketplacePublicationError
} from '../shared/MarketplacePublicationState';

@Injectable()
export class UpdateFravegaPrice {
  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    private readonly resolvePrice: ResolveFravegaPrice,

    @Inject('IUpdateFravegaPriceRepository')
    private readonly driver: IUpdateFravegaPriceRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();

    try {
      const precioLista = Number(params.valorNuevo);

      if (!Number.isFinite(precioLista) || precioLista <= 0) {
        throw new Error(`Invalid valorNuevo: ${params.valorNuevo}`);
      }

      const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(params.sku, 'fravega');

      if (!snapshot) {
        throw new Error(buildNotPublishedMarketplaceMessage(params.sku, 'fravega'));
      }

      const prices = this.resolvePrice.resolve(precioLista);

      const payload: UpdateFravegaPriceRequest = {
        list: prices.list,
        sale: prices.sale,
        net: prices.net
      };

      await this.driver.updateByRefId(params.sku, payload);

      console.log(`[MKT-CHANGES] Fravega response | SKU=${params.sku} | OK`);

      return {
        marketplace: 'fravega',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = normalizeMarketplacePublicationError(error, params.sku, 'fravega');
      if (!isNotPublishedMarketplaceMessage(message)) {
        console.log(`[MKT-CHANGES] Fravega update FAILED | SKU=${params.sku} | error=${message}`);
      }

      return {
        marketplace: 'fravega',
        status: 'FAILED',
        error: message,
        durationMs: Date.now() - startedAt
      };
    }
  }
}
