import { Injectable, Inject, Logger } from '@nestjs/common';
import { BulkMarketplaceProductsDto } from 'src/core/entitis/madre-api/product-sync/dto/BulkMarketplaceProductsDto';
import { ISendBulkProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/ISendBulkProductSyncRepository';
import { IProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/IProductSyncRepository';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { MarketplaceImportStrategyResolver } from './factory/MarketplaceImportStrategyResolver';
import { MarketplaceHttpError } from 'src/core/drivers/repositories/marketplace-api/http/errors/MarketplaceHttpError';

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

type FetchProductsResult = Awaited<
  ReturnType<ReturnType<MarketplaceImportStrategyResolver['resolve']>['getProducts']>
>;

@Injectable()
export class ImportMarketplaceProducts {
  private readonly logger = new Logger(ImportMarketplaceProducts.name);

  private readonly FETCH_BATCH_LIMIT = 25;
  private readonly MADRE_BULK_MAX_ITEMS = 5;
  private readonly MIN_FETCH_BATCH_LIMIT = 1;
  private readonly MAX_FETCH_RETRIES = 3;
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
    const seenExternalIds = new Set<string>();

    let offset = 0;
    let hasNext = true;
    let knownTotal: number | null = null;

    let totalBatches = 0;
    let totalItems = 0;
    let failedItems = 0;

    this.logger.log(`[IMPORT][${marketplace}] started | runId=${runId}`);

    try {
      while (hasNext) {
        let response: FetchProductsResult;

        try {
          const requestedLimit =
            knownTotal === null ? this.FETCH_BATCH_LIMIT : Math.min(this.FETCH_BATCH_LIMIT, Math.max(knownTotal - offset, 1));

          response = await this.fetchProductsWithRetry(strategy, marketplace, offset, requestedLimit);
        } catch (err: any) {
          if (totalItems > 0) {
            await this.syncRuns.finish(runId, 'PARTIAL');

            this.logger.error(
              `[IMPORT][${marketplace}] stopped early after partial import | runId=${runId} | offset=${offset} | imported=${totalItems} | failed=${failedItems} | statusCode=${err?.statusCode ?? 'unknown'} | response=${JSON.stringify(err?.response ?? err?.data ?? null)}`
            );

            return;
          }

          throw err;
        }

        this.logger.log(
          `[IMPORT][${marketplace}] fetched page | offset=${offset} | items=${response?.items?.length ?? 0} | hasNext=${response?.hasNext ?? false} | nextOffset=${response?.nextOffset ?? 'null'} | debug=${JSON.stringify(response?.debug ?? {})}`
        );

        if (!response || !Array.isArray(response.items)) {
          throw new Error(`[${marketplace}] Invalid response`);
        }

        if (response.items.length === 0) break;

        const sourceTotal = Number(response?.debug?.sourceTotal ?? NaN);
        if (Number.isFinite(sourceTotal) && sourceTotal > 0) {
          knownTotal = sourceTotal;
        }

        const externalIds = response.items.map(item => String(item.publicationId));
        const repeatedIds = externalIds.filter(id => seenExternalIds.has(id));

        externalIds.forEach(id => seenExternalIds.add(id));

        this.logger.log(
          `[IMPORT][${marketplace}] page ids | first=${externalIds[0] ?? '-'} | last=${externalIds[externalIds.length - 1] ?? '-'} | uniqueSeen=${seenExternalIds.size} | repeatedInRun=${repeatedIds.length}`
        );

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
          } else {
            totalItems += payload.items.length;
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
          if (typeof response.nextOffset !== 'number') {
            throw new Error(`[${marketplace}] Missing nextOffset while hasNext=true`);
          }
          offset = response.nextOffset!;
        }
      }

      await this.syncRuns.finish(runId, failedItems > 0 ? 'PARTIAL' : 'SUCCESS');

      this.logger.log(
        `[IMPORT][${marketplace}] finished | runId=${runId} | batches=${totalBatches} | items=${totalItems}`
      );
    } catch (err: any) {
      await this.syncRuns.fail(runId, err?.message ?? 'Unknown error');
      this.logger.error(
        `[IMPORT][${marketplace}] failed | runId=${runId} | statusCode=${err?.statusCode ?? 'unknown'} | response=${JSON.stringify(err?.response ?? err?.data ?? null)}`,
        err?.stack
      );
      throw err;
    }
  }

  private async fetchProductsWithRetry(
    strategy: ReturnType<MarketplaceImportStrategyResolver['resolve']>,
    marketplace: ProductSyncMarketplace,
    offset: number,
    limit: number
  ): Promise<FetchProductsResult> {
    let lastError: unknown;
    const safeLimit = Math.max(limit, this.MIN_FETCH_BATCH_LIMIT);

    for (let attempt = 1; attempt <= this.MAX_FETCH_RETRIES; attempt++) {
      try {
        return await strategy.getProducts(safeLimit, offset);
      } catch (error) {
        lastError = error;
        const marketplaceError = error as MarketplaceHttpError;

        this.logger.warn(
          `[IMPORT][${marketplace}] fetch retry ${attempt}/${this.MAX_FETCH_RETRIES} failed | offset=${offset} | limit=${safeLimit} | statusCode=${marketplaceError?.statusCode ?? 'unknown'} | response=${JSON.stringify(marketplaceError?.response ?? marketplaceError?.message ?? null)}`
        );

        if (attempt === this.MAX_FETCH_RETRIES) {
          break;
        }

        await new Promise(res => setTimeout(res, this.RETRY_DELAY_MS));
      }
    }

    if (safeLimit > this.MIN_FETCH_BATCH_LIMIT) {
      const fallbackLimit = this.getFallbackFetchLimit(safeLimit);

      this.logger.warn(
        `[IMPORT][${marketplace}] retrying fetch with smaller page size | offset=${offset} | previousLimit=${safeLimit} | nextLimit=${fallbackLimit}`
      );

      return this.fetchProductsWithRetry(strategy, marketplace, offset, fallbackLimit);
    }

    throw lastError;
  }

  private getFallbackFetchLimit(limit: number): number {
    if (limit > 10) {
      return 10;
    }

    if (limit > 5) {
      return 5;
    }

    return this.MIN_FETCH_BATCH_LIMIT;
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
