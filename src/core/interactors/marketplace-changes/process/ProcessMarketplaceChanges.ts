import { Inject, Injectable } from '@nestjs/common';
import { IGetPausedMarketplaceSkusRepository } from 'src/core/adapters/repositories/madre/paused-skus/IGetPausedMarketplaceSkusRepository';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { ISendBulkProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/ISendBulkProductSyncRepository';
import { MadreDeltaChange } from 'src/core/entitis/madre-api/product-delta/MadreDeltaChange';
import { BulkMarketplaceProductsDto } from 'src/core/entitis/madre-api/product-sync/dto/BulkMarketplaceProductsDto';
import { ChangeProcessingResult } from 'src/core/entitis/marketplace-changes/ChangeProcessingResult';
import { MarketplaceActionResult, MarketplaceName } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { ProcessPriceChanges } from 'src/core/interactors/marketplace-changes/process/ProcessPriceChanges';
import { ProcessStockChanges } from 'src/core/interactors/marketplace-changes/process/ProcessStockChanges';
import { ProcessStatusChanges } from 'src/core/interactors/marketplace-changes/process/ProcessStatusChanges';

@Injectable()
export class ProcessMarketplaceChanges {
  constructor(
    private readonly processPriceChanges: ProcessPriceChanges,
    private readonly processStockChanges: ProcessStockChanges,
    private readonly processStatusChanges: ProcessStatusChanges,

    @Inject('IGetPausedMarketplaceSkusRepository')
    private readonly pausedSkus: IGetPausedMarketplaceSkusRepository,

    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    @Inject('ISendBulkProductSyncRepository')
    private readonly sendBulkProductSync: ISendBulkProductSyncRepository
  ) {}

  async processPage(items: MadreDeltaChange[]): Promise<ChangeProcessingResult[]> {
    console.log(`[MKT-CHANGES] Processing page | items=${items.length}`);
    const results: ChangeProcessingResult[] = [];
    const pausedBySku = await this.getPausedBySku(items);

    for (const item of items) {
      if (pausedBySku.get(item.sku) === true) {
        console.log(`[MKT-CHANGES] Change forced to inactive | SKU=${item.sku} | id=${item.id} | reason=paused-sku`);
        results.push(await this.processPausedSku(item));
        continue;
      }

      results.push(await this.processSingle(item));
    }

    const summary = results.reduce(
      (acc, r) => {
        acc[r.overall] = (acc[r.overall] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log(
      `[MKT-CHANGES] Page done | SUCCESS=${summary.SUCCESS ?? 0} PARTIAL=${summary.PARTIAL ?? 0} FAILED=${summary.FAILED ?? 0}`
    );

    return results;
  }

  async processSingle(change: MadreDeltaChange): Promise<ChangeProcessingResult> {
    console.log(`[MKT-CHANGES] Change ${change.operacion} ${change.campo} | SKU=${change.sku} | id=${change.id}`);

    if (change.operacion !== 'UPDATE') {
      console.log(`[MKT-CHANGES] Skip | unsupported operacion=${change.operacion} | id=${change.id}`);
      return {
        changeId: change.id,
        sku: change.sku,
        campo: change.campo,
        results: [],
        overall: 'FAILED'
      };
    }

    switch (change.campo) {
      case 'precio':
        return this.processPriceChanges.execute(change);
      case 'stock':
        return this.processStockChanges.execute(change);
      case 'estado':
        return this.processStatusChanges.execute(change);
      default: {
        console.log(`[MKT-CHANGES] Skip | unsupported campo=${String(change.campo)} | id=${change.id}`);
        return {
          changeId: change.id,
          sku: change.sku,
          campo: change.campo,
          results: [],
          overall: 'FAILED'
        };
      }
    }
  }

  private async getPausedBySku(items: MadreDeltaChange[]): Promise<Map<string, boolean>> {
    const skus = Array.from(new Set(items.map(item => item.sku).filter(Boolean)));

    if (skus.length === 0) {
      return new Map();
    }

    const response = await this.pausedSkus.getPausedSkus(skus);

    return new Map(response.items.map(item => [item.sku, item.paused]));
  }

  private async processPausedSku(change: MadreDeltaChange): Promise<ChangeProcessingResult> {
    const result = await this.processStatusChanges.execute({
      ...change,
      campo: 'estado',
      valorNuevo: 'inactive'
    });

    await this.syncPausedSku(change, result.results);

    return result;
  }

  private async syncPausedSku(change: MadreDeltaChange, results: MarketplaceActionResult[]): Promise<void> {
    for (const result of results) {
      if (result.status !== 'SUCCESS') {
        continue;
      }

      try {
        const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(change.sku, result.marketplace);

        if (!snapshot) {
          continue;
        }

        const payload: BulkMarketplaceProductsDto = {
          marketplace: result.marketplace,
          items: [
            {
              externalId: snapshot.externalId,
              sellerSku: change.sku,
              marketplaceSku: snapshot.marketplaceSku,
              price: snapshot.price,
              stock: snapshot.stock,
              status: 'PAUSED',
              raw: {
                source: 'marketplace-changes-paused-sku',
                changeId: change.id,
                sku: change.sku,
                marketplace: result.marketplace,
                syncedAt: new Date().toISOString(),
                previousSnapshot: snapshot
              }
            }
          ]
        };

        await this.sendBulkProductSync.execute(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(
          `[MKT-CHANGES] Paused sync item update failed | SKU=${change.sku} | marketplace=${result.marketplace} | error=${message}`
        );
      }
    }
  }
}
