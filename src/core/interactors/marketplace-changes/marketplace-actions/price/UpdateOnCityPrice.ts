import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IUpdatePriceRepository } from 'src/core/adapters/repositories/marketplace/oncity/products/update-price/IUpdatePriceRepository';
import { OnCityUpdatePriceRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-price/UpdatePriceRequest';
import { ResolveOnCityPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/pricing/ResolveOnCityPrice';
import {
  buildNotPublishedMarketplaceMessage,
  isNotPublishedMarketplaceMessage
} from '../shared/MarketplacePublicationState';

@Injectable()
export class UpdateOnCityPrice {
  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    private readonly resolvePrice: ResolveOnCityPrice,

    @Inject('IUpdateOnCityPriceRepository')
    private readonly driver: IUpdatePriceRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();

    try {
      const precioLista = Number(params.valorNuevo);

      if (!Number.isFinite(precioLista) || precioLista <= 0) {
        throw new Error(`Invalid valorNuevo: ${params.valorNuevo}`);
      }

      const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(params.sku, 'oncity');

      if (!snapshot) {
        throw new Error(buildNotPublishedMarketplaceMessage(params.sku, 'oncity'));
      }

      const skuId = Number(snapshot.marketplaceSku);

      if (!Number.isFinite(skuId)) {
        throw new Error(`Invalid skuId (marketplaceSku) for sku=${params.sku}: ${snapshot.marketplaceSku}`);
      }

      const prices = await this.resolvePrice.resolve(params.sku, precioLista);

      const payload: OnCityUpdatePriceRequest = {
        skuId,
        listPrice: prices.listPrice,
        costPrice: prices.costPrice,
        markup: prices.markup
      };

      console.log(
        `[MKT-CHANGES] OnCity payload | SKU=${params.sku} | skuId=${skuId} | listPrice=${prices.listPrice} | costPrice=${prices.costPrice} | markup=${prices.markup}`
      );

      await this.driver.updatePrice(payload);

      console.log(`[MKT-CHANGES] OnCity response | SKU=${params.sku} | OK`);

      return {
        marketplace: 'oncity',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isNotPublishedMarketplaceMessage(message)) {
        console.log(`[MKT-CHANGES] OnCity update FAILED | SKU=${params.sku} | error=${message}`);
      }

      return {
        marketplace: 'oncity',
        status: 'FAILED',
        error: message,
        durationMs: Date.now() - startedAt
      };
    }
  }
}
