import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  REFRESH_MARKETPLACE_PUBLISHED_ITEM_JOB_NAME,
  refreshMarketplacePublishedQueue
} from 'src/app/driver/repository/redis/refresh-marketplace-published.queue';
import { MarketplaceName } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';

export type EnqueueRefreshMarketplacePublishedInput = {
  marketplace: MarketplaceName;
  skus: string[];
  runId?: string;
};

export type EnqueueRefreshMarketplacePublishedResult = {
  runId: string;
  marketplace: MarketplaceName;
  queued: number;
  skippedDuplicates: number;
  items: Array<{
    sku: string;
    jobId?: string;
  }>;
};

@Injectable()
export class RefreshMarketplacePublishedQueueService {
  async enqueue(input: EnqueueRefreshMarketplacePublishedInput): Promise<EnqueueRefreshMarketplacePublishedResult> {
    const runId = input.runId?.trim() || randomUUID();
    const skus = this.normalizeSkus(input.skus);
    const items: EnqueueRefreshMarketplacePublishedResult['items'] = [];

    for (const sku of skus.unique) {
      const job = await refreshMarketplacePublishedQueue.add(
        REFRESH_MARKETPLACE_PUBLISHED_ITEM_JOB_NAME,
        {
          runId,
          marketplace: input.marketplace,
          sku,
          queuedAt: new Date().toISOString()
        },
        {
          attempts: this.resolvePositiveInteger(process.env.REFRESH_MARKETPLACE_PUBLISHED_JOB_ATTEMPTS, 3),
          backoff: {
            type: 'exponential',
            delay: this.resolveNonNegativeInteger(process.env.REFRESH_MARKETPLACE_PUBLISHED_JOB_BACKOFF_MS, 30_000)
          },
          jobId: this.buildJobId(runId, input.marketplace, sku)
        }
      );

      items.push({
        sku,
        jobId: job.id
      });
    }

    return {
      runId,
      marketplace: input.marketplace,
      queued: items.length,
      skippedDuplicates: skus.duplicates,
      items
    };
  }

  private normalizeSkus(skus: string[]): { unique: string[]; duplicates: number } {
    const seen = new Set<string>();
    const unique: string[] = [];
    let duplicates = 0;

    for (const item of skus) {
      const sku = String(item ?? '').trim();

      if (!sku) {
        continue;
      }

      if (seen.has(sku)) {
        duplicates++;
        continue;
      }

      seen.add(sku);
      unique.push(sku);
    }

    return {
      unique,
      duplicates
    };
  }

  private buildJobId(runId: string, marketplace: MarketplaceName, sku: string): string {
    return `${this.sanitizeJobIdPart(runId)}-${marketplace}-${this.sanitizeJobIdPart(sku)}`;
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
