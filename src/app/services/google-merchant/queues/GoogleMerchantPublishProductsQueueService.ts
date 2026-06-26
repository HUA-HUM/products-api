import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  GOOGLE_MERCHANT_PUBLISH_PRODUCT_JOB_NAME,
  googleMerchantPublishProductsQueue
} from 'src/app/driver/repository/redis/google-merchant-publish-products.queue';
import {
  EnqueueGoogleMerchantPublishProductInput,
  EnqueueGoogleMerchantPublishProductResult,
  IGoogleMerchantPublishProductsQueue
} from 'src/core/adapters/queues/google-merchant/IGoogleMerchantPublishProductsQueue';

@Injectable()
export class GoogleMerchantPublishProductsQueueService implements IGoogleMerchantPublishProductsQueue {
  async enqueueProducts(
    products: EnqueueGoogleMerchantPublishProductInput[]
  ): Promise<EnqueueGoogleMerchantPublishProductResult[]> {
    const results: EnqueueGoogleMerchantPublishProductResult[] = [];

    for (const item of products) {
      const sku = this.resolveSku(item);
      const productId = String(item.product.id ?? '').trim();
      const job = await googleMerchantPublishProductsQueue.add(
        GOOGLE_MERCHANT_PUBLISH_PRODUCT_JOB_NAME,
        {
          runId: item.runId,
          product: item.product,
          source: {
            page: item.page,
            offset: item.offset,
            limit: item.limit
          },
          queuedAt: new Date().toISOString()
        },
        {
          attempts: this.resolvePositiveInteger(process.env.GOOGLE_MERCHANT_QUEUE_JOB_ATTEMPTS, 3),
          backoff: {
            type: 'exponential',
            delay: this.resolveNonNegativeInteger(process.env.GOOGLE_MERCHANT_QUEUE_JOB_BACKOFF_MS, 30_000)
          },
          jobId: this.buildJobId(item.runId, sku || productId || randomUUID())
        }
      );

      results.push({
        productId,
        sku,
        jobId: job.id
      });
    }

    return results;
  }

  private resolveSku(item: EnqueueGoogleMerchantPublishProductInput): string {
    return String(item.product.asin ?? item.product.id ?? '').trim();
  }

  private buildJobId(runId: string, productKey: string): string {
    return `${this.sanitizeJobIdPart(runId)}-${this.sanitizeJobIdPart(productKey)}`;
  }

  private sanitizeJobIdPart(value: string): string {
    const sanitized = String(value)
      .trim()
      .replace(/:/g, '_');

    return sanitized || randomUUID();
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
}
