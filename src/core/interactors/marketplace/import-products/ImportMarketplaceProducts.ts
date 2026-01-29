import { Injectable, Inject } from '@nestjs/common';
import { BulkMarketplaceProductsDto } from 'src/core/entitis/madre-api/product-sync/dto/BulkMarketplaceProductsDto';
import { ISendBulkProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/ISendBulkProductSyncRepository';
import { IProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/IProductSyncRepository';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { MarketplaceImportStrategyResolver } from './factory/MarketplaceImportStrategyResolver';

@Injectable()
export class ImportMarketplaceProducts {
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

  async execute(marketplace: ProductSyncMarketplace): Promise<void> {
    const strategy = this.strategyResolver.resolve(marketplace);

    const { runId } = await this.syncRuns.start(marketplace);

    let offset = 0;
    let hasNext = true;
    let failedItems = 0;

    try {
      while (hasNext) {
        const response = await strategy.getProducts(this.BATCH_LIMIT, offset);

        /* ---------------- VALIDACIONES ---------------- */

        if (!response || !Array.isArray(response.items)) {
          throw new Error(`Invalid ${marketplace} response`);
        }

        if (response.items.length === 0) break;

        /* ---------------- PAYLOAD MADRE ---------------- */

        const payload: BulkMarketplaceProductsDto = {
          marketplace,
          items: response.items.map(item => ({
            externalId: String(item.publicationId),
            sellerSku: item.sellerSku,
            marketplaceSku: item.marketSku ?? null,
            price: item.price,
            stock: item.stock,
            status: strategy.mapStatus(item.status),
            raw: item
          }))
        };

        const success = await this.sendWithRetry(payload);

        if (!success) failedItems += payload.items.length;

        await this.syncRuns.progress(runId, {
          batches: 1,
          items: payload.items.length,
          failed: success ? 0 : payload.items.length
        });

        hasNext = response.hasNext === true;

        if (hasNext) {
          if (typeof response.nextOffset !== 'number') {
            throw new Error(`[${marketplace}] Invalid pagination: hasNext=true but nextOffset is missing`);
          }

          offset = response.nextOffset;
        }
      }

      await this.syncRuns.finish(runId, failedItems > 0 ? 'PARTIAL' : 'SUCCESS');
    } catch (err: any) {
      await this.syncRuns.fail(runId, err?.message ?? 'Unknown error');
      throw err;
    }
  }

  /* ========================= RETRY ========================= */

  private async sendWithRetry(payload: BulkMarketplaceProductsDto): Promise<boolean> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.sendBulkProductSync.execute(payload);
        return true;
      } catch {
        if (attempt < this.MAX_RETRIES) {
          await this.sleep(this.RETRY_DELAY_MS);
        }
      }
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
