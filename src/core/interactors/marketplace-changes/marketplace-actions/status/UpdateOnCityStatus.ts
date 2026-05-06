import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IGetOncityProductRepository } from 'src/core/adapters/repositories/marketplace/oncity/products/get/IGetOncityProductRepository';
import { IUpdateStatusProductRepository } from 'src/core/adapters/repositories/marketplace/oncity/products/update-status/IUpdateStatusProductRepository';
import { mapDeltaStatus } from './mapper/MapDeltaStatus';
import { mapOnCityRawToUpdateRequest } from './mapper/MapOnCityRawToUpdateRequest';
import {
  buildNotPublishedMarketplaceMessage,
  isNotPublishedMarketplaceMessage
} from '../shared/MarketplacePublicationState';

@Injectable()
export class UpdateOnCityStatus {
  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    @Inject('IGetOnCityProductRepository')
    private readonly getOnCity: IGetOncityProductRepository,

    @Inject('IUpdateOnCityStatusRepository')
    private readonly updateOnCity: IUpdateStatusProductRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();

    try {
      const desired = mapDeltaStatus(params.valorNuevo);
      const oncityStatus: 'active' | 'inactive' = desired === 'active' ? 'active' : 'inactive';

      const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(params.sku, 'oncity');

      if (!snapshot) {
        throw new Error(buildNotPublishedMarketplaceMessage(params.sku, 'oncity'));
      }

      const skuId = Number(snapshot.marketplaceSku);

      if (!Number.isFinite(skuId)) {
        throw new Error(`Invalid skuId (marketplaceSku) for sku=${params.sku}: ${snapshot.marketplaceSku}`);
      }

      console.log(
        `[MKT-CHANGES] OnCity status lookup | SKU=${params.sku} | skuId=${skuId} | desired=${oncityStatus}`
      );

      const raw = await this.getOnCity.getRawBySkuId(skuId);

      if (!raw || !raw.ProductId) {
        throw new Error(`OnCity raw product missing or invalid for skuId=${skuId}`);
      }

      const productId = String(raw.ProductId);
      const payload = mapOnCityRawToUpdateRequest(raw, oncityStatus);

      console.log(
        `[MKT-CHANGES] OnCity status payload | SKU=${params.sku} | productId=${productId} | status=${oncityStatus}`
      );

      await this.updateOnCity.updateStatus(productId, payload);

      console.log(`[MKT-CHANGES] OnCity status response | SKU=${params.sku} | OK`);

      return {
        marketplace: 'oncity',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isNotPublishedMarketplaceMessage(message)) {
        console.log(`[MKT-CHANGES] OnCity status update FAILED | SKU=${params.sku} | error=${message}`);
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
