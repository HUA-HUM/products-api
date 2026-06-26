import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IGoogleMerchantPublishProductsQueue } from 'src/core/adapters/queues/google-merchant/IGoogleMerchantPublishProductsQueue';
import { IGetGoogleMerchantActiveProductsRepository } from 'src/core/adapters/repositories/madre/google-merchant/get/IGetGoogleMerchantActiveProductsRepository';
import { MadreGoogleMerchantActiveProduct } from 'src/core/entitis/madre-api/google-merchant/get/GoogleMerchantActiveProductsResponse';

export type PublishAllGoogleMerchantProductsInput = {
  limit?: number;
  offset?: number;
  maxPages?: number;
  runId?: string;
};

export type PublishAllGoogleMerchantProductsSummary = {
  runId: string;
  mode: 'queued';
  pagesProcessed: number;
  itemsFetched: number;
  queued: {
    success: number;
    failed: number;
  };
  published: {
    success: number;
    failed: number;
  };
  skipped: {
    alreadyExists: number;
  };
  sync: {
    success: number;
    failed: number;
  };
  hasNext: boolean;
  nextOffset: number | null;
  failures: Array<{
    sku: string;
    error: string;
    statusCode?: number;
    details?: unknown;
  }>;
  syncFailures: Array<{
    sku: string;
    error: string;
  }>;
  enqueueFailures: Array<{
    productId: string;
    sku: string;
    error: string;
  }>;
  pageFetchFailures: Array<{
    page: number;
    offset: number;
    limit: number;
    error: string;
    statusCode?: number;
    details?: unknown;
  }>;
  queuedItems: Array<{
    productId: string;
    sku: string;
    jobId?: string;
  }>;
  skippedItems: Array<{
    sku: string;
    reason: string;
  }>;
};

@Injectable()
export class PublishAllGoogleMerchantProducts {
  private readonly logger = new Logger(PublishAllGoogleMerchantProducts.name);

  constructor(
    @Inject('IGetGoogleMerchantActiveProductsRepository')
    private readonly getActiveProducts: IGetGoogleMerchantActiveProductsRepository,

    @Inject('IGoogleMerchantPublishProductsQueue')
    private readonly publishProductsQueue: IGoogleMerchantPublishProductsQueue
  ) {}

  async execute(input: PublishAllGoogleMerchantProductsInput = {}): Promise<PublishAllGoogleMerchantProductsSummary> {
    const limit = Math.max(1, input.limit ?? 50);
    const maxPages = input.maxPages ? Math.max(1, input.maxPages) : null;
    const runId = input.runId?.trim() || randomUUID();

    let offset = Math.max(0, input.offset ?? 0);
    let pagesProcessed = 0;
    let itemsFetched = 0;
    let hasNext = false;
    let nextOffset: number | null = null;

    const summary: PublishAllGoogleMerchantProductsSummary = {
      runId,
      mode: 'queued',
      pagesProcessed: 0,
      itemsFetched: 0,
      queued: {
        success: 0,
        failed: 0
      },
      published: {
        success: 0,
        failed: 0
      },
      skipped: {
        alreadyExists: 0
      },
      sync: {
        success: 0,
        failed: 0
      },
      hasNext: false,
      nextOffset: null,
      failures: [],
      syncFailures: [],
      enqueueFailures: [],
      pageFetchFailures: [],
      queuedItems: [],
      skippedItems: []
    };

    this.logger.log(
      `[GOOGLE-MERCHANT][PUBLISH][QUEUE] started | runId=${runId} | offset=${offset} | limit=${limit} | maxPages=${maxPages ?? 'all'}`
    );

    do {
      const pageNumber = pagesProcessed + 1;
      const pageResult = await this.fetchPageWithRetry(limit, offset, pageNumber);

      if (!pageResult.success) {
        hasNext = true;
        nextOffset = offset;
        summary.pageFetchFailures.push({
          page: pageNumber,
          offset,
          limit,
          error: pageResult.error,
          statusCode: pageResult.statusCode,
          details: pageResult.details
        });
        this.logger.error(
          `[GOOGLE-MERCHANT][PUBLISH][QUEUE] page fetch failed | runId=${runId} | page=${pageNumber} | offset=${offset} | limit=${limit} | statusCode=${pageResult.statusCode ?? 'unknown'} | reason=${pageResult.error} | details=${this.stringifyForLog(pageResult.details)}`
        );
        break;
      }

      const page = pageResult.page;

      pagesProcessed += 1;
      itemsFetched += page.items.length;
      hasNext = page.hasNext;
      nextOffset = page.nextOffset;

      this.logger.log(
        `[GOOGLE-MERCHANT][PUBLISH][QUEUE] page fetched | runId=${runId} | page=${pagesProcessed} | offset=${offset} | count=${page.items.length} | hasNext=${hasNext}`
      );

      if (page.items.length === 0) {
        break;
      }

      for (const product of page.items) {
        await this.enqueueProduct(product, {
          runId,
          page: pagesProcessed,
          offset,
          limit,
          summary
        });
      }

      if (!hasNext) {
        break;
      }

      offset = nextOffset ?? offset + limit;
    } while (maxPages === null || pagesProcessed < maxPages);

    summary.pagesProcessed = pagesProcessed;
    summary.itemsFetched = itemsFetched;
    summary.hasNext = hasNext;
    summary.nextOffset = nextOffset;

    this.logger.log(
      `[GOOGLE-MERCHANT][PUBLISH][QUEUE] finished | runId=${summary.runId} | pages=${summary.pagesProcessed} | fetched=${summary.itemsFetched} | queuedOk=${summary.queued.success} | queuedFailed=${summary.queued.failed} | pageFetchFailed=${summary.pageFetchFailures.length} | hasNext=${summary.hasNext} | nextOffset=${summary.nextOffset ?? 'null'}`
    );

    return summary;
  }

  private async enqueueProduct(
    product: MadreGoogleMerchantActiveProduct,
    params: {
      runId: string;
      page: number;
      offset: number;
      limit: number;
      summary: PublishAllGoogleMerchantProductsSummary;
    }
  ): Promise<void> {
    const productId = String(product.id ?? '').trim();
    const sku = this.resolveSku(product);

    try {
      const [result] = await this.publishProductsQueue.enqueueProducts([
        {
          runId: params.runId,
          product,
          page: params.page,
          offset: params.offset,
          limit: params.limit
        }
      ]);

      params.summary.queued.success += 1;
      params.summary.queuedItems.push(result);

      this.logger.log(
        `[GOOGLE-MERCHANT][PUBLISH][QUEUE] enqueued | runId=${params.runId} | productId=${productId || '-'} | sku=${sku || '-'} | jobId=${result?.jobId ?? '-'}`
      );
    } catch (error: any) {
      const errorMessage = error?.message ?? 'GOOGLE_MERCHANT_QUEUE_ENQUEUE_ERROR';
      params.summary.queued.failed += 1;
      params.summary.enqueueFailures.push({
        productId,
        sku,
        error: errorMessage
      });
      params.summary.failures.push({
        sku,
        error: errorMessage
      });

      this.logger.error(
        `[GOOGLE-MERCHANT][PUBLISH][QUEUE] enqueue failed | runId=${params.runId} | productId=${productId || '-'} | sku=${sku || '-'} | reason=${errorMessage}`
      );
    }
  }

  private async fetchPageWithRetry(
    limit: number,
    offset: number,
    pageNumber: number
  ): Promise<
    | { success: true; page: Awaited<ReturnType<IGetGoogleMerchantActiveProductsRepository['listActive']>> }
    | { success: false; error: string; statusCode?: number; details?: unknown }
  > {
    const maxAttempts = this.resolvePositiveInteger(process.env.GOOGLE_MERCHANT_MADRE_FETCH_MAX_ATTEMPTS, 3);
    const baseDelayMs = this.resolveNonNegativeInteger(process.env.GOOGLE_MERCHANT_MADRE_FETCH_RETRY_DELAY_MS, 1000);
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const page = await this.getActiveProducts.listActive(limit, offset);

        if (attempt > 1) {
          this.logger.log(
            `[GOOGLE-MERCHANT][PUBLISH][QUEUE] page fetch retry succeeded | page=${pageNumber} | offset=${offset} | attempt=${attempt}/${maxAttempts}`
          );
        }

        return {
          success: true,
          page
        };
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error) || attempt === maxAttempts) {
          return {
            success: false,
            error: this.resolveErrorMessage(error, 'MADRE_ACTIVE_PRODUCTS_FETCH_ERROR'),
            statusCode: this.resolveErrorStatusCode(error),
            details: this.resolveErrorDetails(error)
          };
        }

        const delayMs = baseDelayMs * attempt;

        this.logger.warn(
          `[GOOGLE-MERCHANT][PUBLISH][QUEUE] retrying Madre page fetch | page=${pageNumber} | offset=${offset} | attempt=${attempt}/${maxAttempts} | nextAttempt=${attempt + 1} | delayMs=${delayMs} | statusCode=${this.resolveErrorStatusCode(error) ?? 'unknown'} | reason=${this.resolveErrorMessage(error, 'MADRE_ACTIVE_PRODUCTS_FETCH_ERROR')}`
        );

        await this.delay(delayMs);
      }
    }

    return {
      success: false,
      error: this.resolveErrorMessage(lastError, 'MADRE_ACTIVE_PRODUCTS_FETCH_ERROR'),
      statusCode: this.resolveErrorStatusCode(lastError),
      details: this.resolveErrorDetails(lastError)
    };
  }

  private isRetryableError(error: unknown): boolean {
    const statusCode = this.resolveErrorStatusCode(error);

    if (statusCode && [408, 429, 500, 502, 503, 504].includes(statusCode)) {
      return true;
    }

    const errorText = `${this.resolveErrorMessage(error, '')} ${this.stringifyForLog(this.resolveErrorDetails(error))}`
      .toLowerCase();

    return (
      errorText.includes('timeout') ||
      errorText.includes('timed out') ||
      errorText.includes('econnaborted') ||
      errorText.includes('econnreset') ||
      errorText.includes('etimedout') ||
      errorText.includes('socket hang up')
    );
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    const message = (error as any)?.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return fallback;
  }

  private resolveErrorStatusCode(error: unknown): number | undefined {
    const statusCode = (error as any)?.statusCode;

    if (typeof statusCode === 'number') {
      return statusCode;
    }

    return undefined;
  }

  private resolveErrorDetails(error: unknown): unknown {
    return (error as any)?.response ?? (error as any)?.details;
  }

  private resolveSku(product: MadreGoogleMerchantActiveProduct): string {
    return String(product.asin ?? product.id ?? 'unknown').trim();
  }

  private resolvePositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  private resolveNonNegativeInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  private delay(ms: number): Promise<void> {
    if (ms <= 0) {
      return Promise.resolve();
    }

    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private stringifyForLog(value: unknown): string {
    if (value === undefined) {
      return 'undefined';
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
