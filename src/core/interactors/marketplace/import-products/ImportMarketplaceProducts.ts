import { Injectable, Inject, Logger } from '@nestjs/common';
import { BulkMarketplaceProductsDto } from 'src/core/entitis/madre-api/product-sync/dto/BulkMarketplaceProductsDto';
import { ISendBulkProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/ISendBulkProductSyncRepository';
import { IProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/IProductSyncRepository';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { MarketplaceImportStrategyResolver } from './factory/MarketplaceImportStrategyResolver';

export type ImportProgress = {
  batchesProcessed: number;
  itemsProcessed: number;
  itemsFailed: number;
};

@Injectable()
export class ImportMarketplaceProducts {
  private readonly logger = new Logger(ImportMarketplaceProducts.name);

  private readonly BATCH_LIMIT = 50;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(
    private readonly strategyResolver: MarketplaceImportStrategyResolver,

    @Inject('ISendBulkProductSyncRepository')
    private readonly sendBulkProductSync: ISendBulkProductSyncRepository,

    @Inject('IProductSyncRepository')
    private readonly syncRuns: IProductSyncRepository
  ) {}

  async execute(
    marketplace: ProductSyncMarketplace,
    onProgress?: (progress: ImportProgress, log?: string) => void
  ): Promise<void> {
    const strategy = this.strategyResolver.resolve(marketplace);
    const { runId } = await this.syncRuns.start(marketplace);

    let offset = 0;
    let hasNext = true;

    let totalBatches = 0;
    let totalItems = 0;
    let failedItems = 0;

    this.logger.log(`[IMPORT][${marketplace}] started | runId=${runId}`);

    try {
      while (hasNext) {
        const response = await strategy.getProducts(this.BATCH_LIMIT, offset);

        if (!response || !Array.isArray(response.items)) {
          throw new Error(`[${marketplace}] Invalid response`);
        }

        if (response.items.length === 0) break;

        totalBatches++;
        totalItems += response.items.length;

        const payload: BulkMarketplaceProductsDto = {
          marketplace,
          items: response.items.map(item => ({
            externalId: String(item.publicationId),
            sellerSku: item.sellerSku,
            marketplaceSku: item.marketSku ?? null,
            price: item.price,
            stock: item.stock,
            status: strategy.mapStatus(item.status),
            raw: item.raw ?? item
          }))
        };

        const success = await this.sendWithRetry(payload);

        if (!success) {
          failedItems += payload.items.length;
        }

        await this.syncRuns.progress(runId, {
          batches: 1,
          items: payload.items.length,
          failed: success ? 0 : payload.items.length
        });

        onProgress?.(
          {
            batchesProcessed: totalBatches,
            itemsProcessed: totalItems,
            itemsFailed: failedItems
          },
          `Batch ${totalBatches} | items=${payload.items.length} | failed=${success ? 0 : payload.items.length}`
        );

        hasNext = response.hasNext === true;
        if (hasNext) {
          offset = response.nextOffset!;
        }
      }

      await this.syncRuns.finish(runId, failedItems > 0 ? 'PARTIAL' : 'SUCCESS');

      this.logger.log(
        `[IMPORT][${marketplace}] finished | runId=${runId} | batches=${totalBatches} | items=${totalItems}`
      );
    } catch (err: any) {
      await this.syncRuns.fail(runId, err?.message ?? 'Unknown error');
      this.logger.error(`[IMPORT][${marketplace}] failed | runId=${runId}`, err?.stack);
      throw err;
    }
  }

  private async sendWithRetry(payload: BulkMarketplaceProductsDto): Promise<boolean> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.sendBulkProductSync.execute(payload);
        return true;
      } catch {
        if (attempt === this.MAX_RETRIES) return false;
        await new Promise(res => setTimeout(res, this.RETRY_DELAY_MS));
      }
    }
    return false;
  }
}
