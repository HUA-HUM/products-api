import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, UnrecoverableError, Worker } from 'bullmq';
import {
  GOOGLE_MERCHANT_PUBLISH_PRODUCTS_QUEUE_NAME
} from 'src/app/driver/repository/redis/google-merchant-publish-products.queue';
import { bullmqConnection } from 'src/app/driver/repository/redis/bullmq.connection';
import { GoogleMerchantPublishProductJobData } from 'src/core/entitis/google-merchant/publish/GoogleMerchantPublishProductJob';
import {
  GoogleMerchantProductPublisher,
  GoogleMerchantProductPublisherResult
} from 'src/core/interactors/google-merchant/publish/GoogleMerchantProductPublisher';

@Injectable()
export class GoogleMerchantPublishProductsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GoogleMerchantPublishProductsWorker.name);
  private worker?: Worker<GoogleMerchantPublishProductJobData, GoogleMerchantProductPublisherResult & Record<string, unknown>>;

  constructor(private readonly publisher: GoogleMerchantProductPublisher) {}

  onModuleInit() {
    this.worker = new Worker<GoogleMerchantPublishProductJobData, GoogleMerchantProductPublisherResult & Record<string, unknown>>(
      GOOGLE_MERCHANT_PUBLISH_PRODUCTS_QUEUE_NAME,
      async (job: Job<GoogleMerchantPublishProductJobData>) => {
        const startedAt = new Date();
        const productId = String(job.data.product.id ?? '');
        const sku = String(job.data.product.asin ?? job.data.product.id ?? 'unknown');

        this.logger.log(
          `[GOOGLE-MERCHANT][WORKER] start | runId=${job.data.runId} | jobId=${job.id} | productId=${productId} | sku=${sku}`
        );
        await job.log(`Started at ${startedAt.toISOString()}`);
        await job.updateProgress({
          stage: 'started',
          runId: job.data.runId,
          productId,
          sku,
          updatedAt: new Date().toISOString()
        });

        const result = await this.publisher.execute(job.data.product, {
          log: async message => {
            await job.log(message);
          },
          progress: progress =>
            job.updateProgress({
              ...progress,
              runId: job.data.runId,
              updatedAt: new Date().toISOString()
            })
        });

        await this.sleep(this.resolveNonNegativeInteger(process.env.GOOGLE_MERCHANT_QUEUE_JOB_DELAY_MS, 150));

        if (!result.success) {
          await job.updateProgress({
            stage: 'failed',
            runId: job.data.runId,
            productId,
            sku,
            status: result.status,
            retryable: result.retryable,
            updatedAt: new Date().toISOString()
          });
          await job.log(`FAILED: ${result.status} | ${result.error}`);

          if (result.retryable) {
            throw new Error(`${result.status}: ${result.error}`);
          }

          throw new UnrecoverableError(`${result.status}: ${result.error}`);
        }

        const finishedAt = new Date();
        await job.log(`Finished at ${finishedAt.toISOString()} with status=${result.status}`);

        this.logger.log(
          `[GOOGLE-MERCHANT][WORKER] finished | runId=${job.data.runId} | jobId=${job.id} | productId=${productId} | sku=${sku} | status=${result.status}`
        );

        return {
          ...result,
          runId: job.data.runId,
          source: job.data.source,
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString()
        };
      },
      {
        connection: bullmqConnection,
        concurrency: this.resolvePositiveInteger(process.env.GOOGLE_MERCHANT_QUEUE_CONCURRENCY, 1),
        lockDuration: this.resolvePositiveInteger(process.env.GOOGLE_MERCHANT_QUEUE_LOCK_DURATION_MS, 10 * 60 * 1000)
      }
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `[GOOGLE-MERCHANT][WORKER] failed | runId=${job?.data?.runId ?? '-'} | jobId=${job?.id ?? '-'} | productId=${job?.data?.product?.id ?? '-'} | sku=${job?.data?.product?.asin ?? '-'} | reason=${err?.message}`,
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

  private async sleep(ms: number): Promise<void> {
    await this.delay(ms);
  }
}
