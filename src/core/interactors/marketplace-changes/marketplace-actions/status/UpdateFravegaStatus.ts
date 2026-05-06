import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IUpdateFravegaStatusRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/update-status/IUpdateFravegaStatusRepository';
import { mapDeltaStatus } from './mapper/MapDeltaStatus';
import {
  buildNotPublishedMarketplaceMessage,
  isNotPublishedMarketplaceMessage,
  normalizeMarketplacePublicationError
} from '../shared/MarketplacePublicationState';

@Injectable()
export class UpdateFravegaStatus {
  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    @Inject('IUpdateFravegaStatusRepository')
    private readonly driver: IUpdateFravegaStatusRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();

    try {
      const desired = mapDeltaStatus(params.valorNuevo);
      const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(params.sku, 'fravega');

      if (!snapshot) {
        throw new Error(buildNotPublishedMarketplaceMessage(params.sku, 'fravega'));
      }

      if (desired === 'active') {
        await this.driver.activateByRefId(params.sku);
      } else {
        await this.driver.deactivateByRefId(params.sku);
      }

      console.log(`[MKT-CHANGES] Fravega status response | SKU=${params.sku} | OK`);

      return {
        marketplace: 'fravega',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = normalizeMarketplacePublicationError(error, params.sku, 'fravega');
      if (!isNotPublishedMarketplaceMessage(message)) {
        console.log(`[MKT-CHANGES] Fravega status update FAILED | SKU=${params.sku} | error=${message}`);
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
