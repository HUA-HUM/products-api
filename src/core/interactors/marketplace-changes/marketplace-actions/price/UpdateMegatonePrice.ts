import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IUpdateMegatoneProductsRepository } from 'src/core/adapters/repositories/marketplace/megatone/products/update-price-stock/IUpdateMegatoneProductsRepository';
import { UpdateMegatoneProductsPayload } from 'src/core/entitis/marketplace-api/megatone/products/update-price-stock/UpdateMegatoneProductsPayload';
import { ResolveMegatonePrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/pricing/ResolveMegatonePrice';

@Injectable()
export class UpdateMegatonePrice {
  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    private readonly resolvePrice: ResolveMegatonePrice,

    @Inject('IUpdateMegatoneProductsRepository')
    private readonly driver: IUpdateMegatoneProductsRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();
    console.log(`[MKT-CHANGES] Update megatone price | SKU=${params.sku} | value=${params.valorNuevo}`);

    try {
      const precioLista = Number(params.valorNuevo);

      if (!Number.isFinite(precioLista) || precioLista <= 0) {
        throw new Error(`Invalid valorNuevo: ${params.valorNuevo}`);
      }

      const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(params.sku, 'megatone');

      if (!snapshot) {
        throw new Error(`No sync_item found for sku=${params.sku} marketplace=megatone`);
      }

      const publicationId = Number(snapshot.externalId);

      if (!Number.isFinite(publicationId)) {
        throw new Error(`Invalid publicationId (externalId) for sku=${params.sku}: ${snapshot.externalId}`);
      }

      const prices = this.resolvePrice.resolve(precioLista);

      const payload: UpdateMegatoneProductsPayload = {
        items: [
          {
            publicationId,
            precioLista: prices.precioLista,
            precioPromocional: prices.precioPromocional
          }
        ]
      };

      console.log(
        `[MKT-CHANGES] Megatone payload | SKU=${params.sku} | publicationId=${publicationId} | lista=${prices.precioLista} | promo=${prices.precioPromocional}`
      );

      const response = await this.driver.update(payload);

      console.log(
        `[MKT-CHANGES] Megatone response | SKU=${params.sku} | status=${response.status} | success=${response.success}/${response.total}`
      );

      return {
        marketplace: 'megatone',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[MKT-CHANGES] Megatone update FAILED | SKU=${params.sku} | error=${message}`);

      return {
        marketplace: 'megatone',
        status: 'FAILED',
        error: message,
        durationMs: Date.now() - startedAt
      };
    }
  }
}
