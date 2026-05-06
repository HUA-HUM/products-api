import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RunMarketplaceChangesWorkerService } from './RunMarketplaceChangesWorkerService';

const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;

@Injectable()
export class RunMarketplaceChangesCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RunMarketplaceChangesCronService.name);
  private readonly intervalMs = this.resolveIntervalMs();
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly worker: RunMarketplaceChangesWorkerService) {}

  onModuleInit(): void {
    this.logger.log(`[CRON] marketplace changes worker scheduled every ${this.intervalMs} ms`);

    this.timer = setInterval(() => {
      void this.runScheduled();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async runScheduled(): Promise<void> {
    if (this.running) {
      this.logger.warn('[CRON] skipped because previous marketplace changes worker execution is still running');
      return;
    }

    this.running = true;

    try {
      this.logger.log('[CRON] starting marketplace changes worker');
      await this.worker.execute();
      this.logger.log('[CRON] marketplace changes worker finished');
    } catch (error) {
      this.logger.error('[CRON] marketplace changes worker failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }

  private resolveIntervalMs(): number {
    const envValue = Number(process.env.MARKETPLACE_CHANGES_CRON_INTERVAL_MS ?? SEVEN_HOURS_MS);

    if (!Number.isFinite(envValue) || envValue <= 0) {
      return SEVEN_HOURS_MS;
    }

    return Math.trunc(envValue);
  }
}
