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

type SendBulkResult =
  | { success: true }
  | {
      success: false;
      errorMessage: string;
      errorDetails?: unknown;
    };

@Injectable()
export class ImportMarketplaceProducts {
  private readonly logger = new Logger(ImportMarketplaceProducts.name);

  private readonly FETCH_BATCH_LIMIT = 50;
  private readonly MADRE_BULK_MAX_ITEMS = 10;
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
        const response = await strategy.getProducts(this.FETCH_BATCH_LIMIT, offset);

        this.logger.log(
          `[IMPORT][${marketplace}] fetched page | offset=${offset} | items=${response?.items?.length ?? 0} | hasNext=${response?.hasNext ?? false} | nextOffset=${response?.nextOffset ?? 'null'} | debug=${JSON.stringify(response?.debug ?? {})}`
        );

        if (!response || !Array.isArray(response.items)) {
          throw new Error(`[${marketplace}] Invalid response`);
        }

        if (response.items.length === 0) break;

        totalItems += response.items.length;

        const mappedItems = response.items.map(item => ({
          externalId: String(item.publicationId),
          sellerSku: item.sellerSku,
          marketplaceSku: item.marketSku ?? null,
          price: item.price,
          stock: item.stock,
          status: strategy.mapStatus(item.status),
          raw: item.raw ?? item
        }));

        const payloadBatches = this.chunkItems(mappedItems, this.MADRE_BULK_MAX_ITEMS);

        for (const payloadItems of payloadBatches) {
          totalBatches++;

          const payload: BulkMarketplaceProductsDto = {
            marketplace,
            items: payloadItems
          };

          const sendResult = await this.sendWithRetry(payload);
          const success = sendResult.success;

          if (!success) {
            failedItems += payload.items.length;
            this.logger.error(
              `[IMPORT][${marketplace}] bulk send failed | batch=${totalBatches} | items=${payload.items.length} | reason=${sendResult.errorMessage}`,
              sendResult.errorDetails ? JSON.stringify(sendResult.errorDetails) : undefined
            );
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
            `Batch ${totalBatches} | items=${payload.items.length} | failed=${success ? 0 : payload.items.length}${success ? '' : ` | reason=${sendResult.errorMessage}`}`
          );
        }

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

  private async sendWithRetry(payload: BulkMarketplaceProductsDto): Promise<SendBulkResult> {
    let lastErrorMessage = 'UNKNOWN_BULK_ERROR';
    let lastErrorDetails: unknown;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.sendBulkProductSync.execute(payload);
        return { success: true };
      } catch (error: any) {
        lastErrorMessage = error?.message || 'UNKNOWN_BULK_ERROR';
        lastErrorDetails = error?.response ?? error?.data ?? error;

        this.logger.warn(
          `[IMPORT][${payload.marketplace}] bulk send retry ${attempt}/${this.MAX_RETRIES} failed | ${lastErrorMessage}`
        );

        if (attempt === this.MAX_RETRIES) {
          return {
            success: false,
            errorMessage: lastErrorMessage,
            errorDetails: lastErrorDetails
          };
        }

        await new Promise(res => setTimeout(res, this.RETRY_DELAY_MS));
      }
    }

    return {
      success: false,
      errorMessage: lastErrorMessage,
      errorDetails: lastErrorDetails
    };
  }

  private chunkItems<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }
}
