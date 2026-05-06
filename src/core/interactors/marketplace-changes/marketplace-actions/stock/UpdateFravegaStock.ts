import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IUpdateFravegaStockRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/update-stock/IUpdateFravegaStockRepository';
import { UpdateFravegaStockRequest } from 'src/core/entitis/marketplace-api/fravega/products/update-stock/UpdateFravegaStockRequest';
import {
  buildNotPublishedMarketplaceMessage,
  isNotPublishedMarketplaceMessage,
  normalizeMarketplacePublicationError
} from '../shared/MarketplacePublicationState';

@Injectable()
export class UpdateFravegaStock {
  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    @Inject('IUpdateFravegaStockRepository')
    private readonly driver: IUpdateFravegaStockRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();

    try {
      if (params.valorNuevo === null || params.valorNuevo === undefined || String(params.valorNuevo).trim() === '') {
        throw new Error(`Invalid valorNuevo (empty or missing)`);
      }

      const quantity = Number(params.valorNuevo);

      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error(`Invalid valorNuevo (must be integer >= 0): ${params.valorNuevo}`);
      }

      const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(params.sku, 'fravega');

      if (!snapshot) {
        throw new Error(buildNotPublishedMarketplaceMessage(params.sku, 'fravega'));
      }

      const payload: UpdateFravegaStockRequest = { quantity };

      await this.driver.updateByRefId(params.sku, payload);

      console.log(`[MKT-CHANGES] Fravega stock response | SKU=${params.sku} | OK`);

      return {
        marketplace: 'fravega',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = normalizeMarketplacePublicationError(error, params.sku, 'fravega');
      if (!isNotPublishedMarketplaceMessage(message)) {
        console.log(`[MKT-CHANGES] Fravega stock update FAILED | SKU=${params.sku} | error=${message}`);
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
