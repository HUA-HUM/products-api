import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ImportMarketplaceProducts } from 'src/core/interactors/marketplace/import-products/ImportMarketplaceProducts';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { IMPORT_MARKETPLACE_QUEUE_NAME } from 'src/app/driver/repository/redis/import-marketplace.queue';
import { bullmqConnection } from 'src/app/driver/repository/redis/bullmq.connection';

@Injectable()
export class ImportMarketplaceWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportMarketplaceWorker.name);
  private worker?: Worker;

  constructor(private readonly importMarketplaceProducts: ImportMarketplaceProducts) {}

  onModuleInit() {
    this.worker = new Worker(
      IMPORT_MARKETPLACE_QUEUE_NAME,
      async (job: Job<{ marketplace: ProductSyncMarketplace }>) => {
        const startedAt = new Date();

        this.logger.log(`[WORKER] start | marketplace=${job.data.marketplace} | jobId=${job.id}`);

        job.log(`Started at ${startedAt.toISOString()}`);

        await this.importMarketplaceProducts.execute(job.data.marketplace, (progress, log) => {
          job.updateProgress({
            ...progress,
            updatedAt: new Date().toISOString()
          });

          if (log) {
            job.log(log);
          }
        });

        const finishedAt = new Date();

        job.log(`Finished at ${finishedAt.toISOString()}`);

        this.logger.log(`[WORKER] finished | marketplace=${job.data.marketplace} | jobId=${job.id}`);

        return {
          status: 'SUCCESS',
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString()
        };
      },
      {
        connection: bullmqConnection,
        concurrency: 1,
        lockDuration: 10 * 60 * 1000
      }
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`[WORKER] failed | jobId=${job?.id}`, err?.stack);

      job?.log(`FAILED: ${err?.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
