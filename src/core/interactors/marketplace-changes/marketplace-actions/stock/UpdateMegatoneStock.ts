import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IUpdateMegatoneProductsRepository } from 'src/core/adapters/repositories/marketplace/megatone/products/update-price-stock/IUpdateMegatoneProductsRepository';
import { UpdateMegatoneProductsPayload } from 'src/core/entitis/marketplace-api/megatone/products/update-price-stock/UpdateMegatoneProductsPayload';

@Injectable()
export class UpdateMegatoneStock {
  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    @Inject('IUpdateMegatoneProductsRepository')
    private readonly driver: IUpdateMegatoneProductsRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();
    console.log(`[MKT-CHANGES] Update megatone stock | SKU=${params.sku} | value=${params.valorNuevo}`);

    try {
      if (params.valorNuevo === null || params.valorNuevo === undefined || String(params.valorNuevo).trim() === '') {
        throw new Error(`Invalid valorNuevo (empty or missing)`);
      }

      const stock = Number(params.valorNuevo);

      if (!Number.isInteger(stock) || stock < 0) {
        throw new Error(`Invalid valorNuevo (must be integer >= 0): ${params.valorNuevo}`);
      }

      const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(params.sku, 'megatone');

      if (!snapshot) {
        throw new Error(`No sync_item found for sku=${params.sku} marketplace=megatone`);
      }

      const publicationId = Number(snapshot.externalId);

      if (!Number.isFinite(publicationId)) {
        throw new Error(`Invalid publicationId (externalId) for sku=${params.sku}: ${snapshot.externalId}`);
      }

      const payload: UpdateMegatoneProductsPayload = {
        items: [{ publicationId, stock }]
      };

      console.log(
        `[MKT-CHANGES] Megatone stock payload | SKU=${params.sku} | publicationId=${publicationId} | stock=${stock}`
      );

      const response = await this.driver.update(payload);

      console.log(
        `[MKT-CHANGES] Megatone stock response | SKU=${params.sku} | status=${response.status} | success=${response.success}/${response.total}`
      );

      return {
        marketplace: 'megatone',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[MKT-CHANGES] Megatone stock update FAILED | SKU=${params.sku} | error=${message}`);

      return {
        marketplace: 'megatone',
        status: 'FAILED',
        error: message,
        durationMs: Date.now() - startedAt
      };
    }
  }
}
