import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IUpdateMegatoneProductStatusRepository } from 'src/core/adapters/repositories/marketplace/megatone/products/update-status/IUpdateMegatoneProductStatusRepository';
import { mapDeltaStatus } from './mapper/MapDeltaStatus';
import {
  buildNotPublishedMarketplaceMessage,
  isNotPublishedMarketplaceMessage
} from '../shared/MarketplacePublicationState';

const MEGATONE_USER_ID = 389;

@Injectable()
export class UpdateMegatoneStatus {
  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    @Inject('IUpdateMegatoneProductStatusRepository')
    private readonly driver: IUpdateMegatoneProductStatusRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();

    try {
      const desired = mapDeltaStatus(params.valorNuevo);
      const megatoneStatus = desired === 'active' ? 1 : 2;

      const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(params.sku, 'megatone');

      if (!snapshot) {
        throw new Error(buildNotPublishedMarketplaceMessage(params.sku, 'megatone'));
      }

      const publicationId = Number(snapshot.externalId);

      if (!Number.isFinite(publicationId)) {
        throw new Error(`Invalid publicationId (externalId) for sku=${params.sku}: ${snapshot.externalId}`);
      }

      console.log(
        `[MKT-CHANGES] Megatone status payload | SKU=${params.sku} | publicationId=${publicationId} | status=${megatoneStatus} (${desired})`
      );

      const response = await this.driver.bulkUpdateStatus(
        [{ publicationId, status: megatoneStatus }],
        MEGATONE_USER_ID
      );

      console.log(
        `[MKT-CHANGES] Megatone status response | SKU=${params.sku} | status=${response.status} | success=${response.success}/${response.total}`
      );

      if (response.status !== 'UPDATED' && response.success === 0) {
        throw new Error(`Megatone bulk update did not succeed: status=${response.status}`);
      }

      return {
        marketplace: 'megatone',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isNotPublishedMarketplaceMessage(message)) {
        console.log(`[MKT-CHANGES] Megatone status update FAILED | SKU=${params.sku} | error=${message}`);
      }

      return {
        marketplace: 'megatone',
        status: 'FAILED',
        error: message,
        durationMs: Date.now() - startedAt
      };
    }
  }
}
