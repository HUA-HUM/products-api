import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IUpdateStockRepository } from 'src/core/adapters/repositories/marketplace/oncity/products/update-stock/IUpdateStockRepository';
import { OnCityUpdateStockRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-stock/UpdateStockRequest';

@Injectable()
export class UpdateOnCityStock {
  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    @Inject('IUpdateOnCityStockRepository')
    private readonly driver: IUpdateStockRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();
    console.log(`[MKT-CHANGES] Update oncity stock | SKU=${params.sku} | value=${params.valorNuevo}`);

    try {
      if (params.valorNuevo === null || params.valorNuevo === undefined || String(params.valorNuevo).trim() === '') {
        throw new Error(`Invalid valorNuevo (empty or missing)`);
      }

      const quantity = Number(params.valorNuevo);

      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error(`Invalid valorNuevo (must be integer >= 0): ${params.valorNuevo}`);
      }

      const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(params.sku, 'oncity');

      if (!snapshot) {
        throw new Error(`No sync_item found for sku=${params.sku} marketplace=oncity`);
      }

      const skuId = Number(snapshot.marketplaceSku);

      if (!Number.isFinite(skuId)) {
        throw new Error(`Invalid skuId (marketplaceSku) for sku=${params.sku}: ${snapshot.marketplaceSku}`);
      }

      const payload: OnCityUpdateStockRequest = { skuId, quantity };

      console.log(
        `[MKT-CHANGES] OnCity stock payload | SKU=${params.sku} | skuId=${skuId} | quantity=${quantity}`
      );

      await this.driver.updateStock(payload);

      console.log(`[MKT-CHANGES] OnCity stock response | SKU=${params.sku} | OK`);

      return {
        marketplace: 'oncity',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[MKT-CHANGES] OnCity stock update FAILED | SKU=${params.sku} | error=${message}`);

      return {
        marketplace: 'oncity',
        status: 'FAILED',
        error: message,
        durationMs: Date.now() - startedAt
      };
    }
  }
}
