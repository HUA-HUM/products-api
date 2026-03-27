import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ImportMarketplaceService } from 'src/app/services/queues/import-marketplace.service';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MARKETPLACES: ProductSyncMarketplace[] = ['fravega', 'megatone', 'oncity'];

@Injectable()
export class ImportMarketplaceCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportMarketplaceCronService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly importMarketplaceService: ImportMarketplaceService) {}

  onModuleInit(): void {
    this.logger.log('[CRON] marketplace import scheduled every 2 hours');

    this.timer = setInterval(() => {
      void this.runScheduled();
    }, TWO_HOURS_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async runScheduled(): Promise<void> {
    if (this.running) {
      this.logger.warn('[CRON] skipped because previous marketplace import scheduling is still running');
      return;
    }

    this.running = true;

    try {
      this.logger.log(`[CRON] starting marketplace import scheduling | marketplaces=${MARKETPLACES.join(',')}`);

      for (const marketplace of MARKETPLACES) {
        const result = await this.importMarketplaceService.enqueueImport(marketplace, 'cron');

        if (result.accepted) {
          this.logger.log(`[CRON] import queued | marketplace=${marketplace}`);
          continue;
        }

        this.logger.warn(`[CRON] import not queued | marketplace=${marketplace} | reason=${result.reason}`);
      }

      this.logger.log('[CRON] marketplace import scheduling finished');
    } catch (error) {
      this.logger.error('[CRON] marketplace import scheduling failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }
}
