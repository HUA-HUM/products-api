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
        this.logger.log(`[WORKER] start import | marketplace=${job.data.marketplace} | jobId=${job.id}`);

        await this.importMarketplaceProducts.execute(job.data.marketplace);

        this.logger.log(`[WORKER] finished import | marketplace=${job.data.marketplace} | jobId=${job.id}`);
      },
      {
        connection: bullmqConnection,
        concurrency: 1 // IMPORTANTÍSIMO: evita imports simultáneos
      }
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`[WORKER] failed | jobId=${job?.id}`, err?.stack);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
