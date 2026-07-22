import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, UnrecoverableError, Worker } from 'bullmq';
import { bullmqConnection } from 'src/app/driver/repository/redis/bullmq.connection';
import { REFRESH_MARKETPLACE_PUBLISHED_QUEUE_NAME } from 'src/app/driver/repository/redis/refresh-marketplace-published.queue';
import { RefreshMarketplacePublishedItemJobData } from 'src/core/entitis/marketplace-changes/RefreshMarketplacePublishedItemJob';
import {
  RefreshMarketplacePublishedItemSummary,
  RefreshMarketplacePublishedItems
} from 'src/core/interactors/marketplace-changes/manual/RefreshMarketplacePublishedItems';

@Injectable()
export class RefreshMarketplacePublishedWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RefreshMarketplacePublishedWorker.name);
  private worker?: Worker<RefreshMarketplacePublishedItemJobData, RefreshMarketplacePublishedItemSummary & Record<string, unknown>>;

  constructor(private readonly refreshMarketplacePublishedItems: RefreshMarketplacePublishedItems) {}

  onModuleInit() {
    this.worker = new Worker<RefreshMarketplacePublishedItemJobData, RefreshMarketplacePublishedItemSummary & Record<string, unknown>>(
      REFRESH_MARKETPLACE_PUBLISHED_QUEUE_NAME,
      async (job: Job<RefreshMarketplacePublishedItemJobData>) => {
        this.logger.log(
          `[REFRESH-PUBLISHED][WORKER] start | runId=${job.data.runId} | jobId=${job.id} | marketplace=${job.data.marketplace} | sku=${job.data.sku}`
        );
        await job.log(`Started at ${new Date().toISOString()}`);
        await job.updateProgress({
          stage: 'started',
          runId: job.data.runId,
          marketplace: job.data.marketplace,
          sku: job.data.sku,
          updatedAt: new Date().toISOString()
        });

        const result = await this.refreshMarketplacePublishedItems.executeOne({
          marketplace: job.data.marketplace,
          sku: job.data.sku
        });

        await job.updateProgress({
          stage: 'finished',
          runId: job.data.runId,
          marketplace: job.data.marketplace,
          sku: job.data.sku,
          sync: result.sync.status,
          updatedAt: new Date().toISOString()
        });

        if (result.sync.status === 'FAILED') {
          await job.log(`SYNC FAILED: ${result.sync.error ?? 'unknown'}`);
          throw new Error(result.sync.error ?? 'SYNC_ITEMS_SAVE_ERROR');
        }

        if (result.sync.status === 'SKIPPED') {
          await job.log(`SKIPPED: ${result.sync.error ?? 'no marketplace update succeeded'}`);

          if (!result.skipped) {
            throw new UnrecoverableError(result.sync.error ?? 'No marketplace update succeeded');
          }
        }

        this.logger.log(
          `[REFRESH-PUBLISHED][WORKER] finished | runId=${job.data.runId} | jobId=${job.id} | marketplace=${job.data.marketplace} | sku=${job.data.sku} | sync=${result.sync.status}`
        );
        await job.log(`Finished at ${new Date().toISOString()} with sync=${result.sync.status}`);

        return {
          ...result,
          runId: job.data.runId
        };
      },
      {
        connection: bullmqConnection,
        concurrency: this.resolvePositiveInteger(process.env.REFRESH_MARKETPLACE_PUBLISHED_QUEUE_CONCURRENCY, 1),
        lockDuration: this.resolvePositiveInteger(
          process.env.REFRESH_MARKETPLACE_PUBLISHED_QUEUE_LOCK_DURATION_MS,
          10 * 60 * 1000
        )
      }
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `[REFRESH-PUBLISHED][WORKER] failed | runId=${job?.data?.runId ?? '-'} | jobId=${job?.id ?? '-'} | marketplace=${job?.data?.marketplace ?? '-'} | sku=${job?.data?.sku ?? '-'} | reason=${err?.message}`,
        err?.stack
      );
      job?.log(`FAILED: ${err?.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private resolvePositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }

    return Math.floor(parsed);
  }
}
