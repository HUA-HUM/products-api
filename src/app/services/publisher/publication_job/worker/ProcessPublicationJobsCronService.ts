import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ProcessPublicationJobsService } from './ProcessPublicationJobsService';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

@Injectable()
export class ProcessPublicationJobsCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcessPublicationJobsCronService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly service: ProcessPublicationJobsService) {}

  onModuleInit(): void {
    this.logger.log('[CRON] publication jobs worker scheduled every 7 minutes');

    this.timer = setInterval(() => {
      void this.runScheduled();
    }, FIVE_MINUTES_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async runScheduled(): Promise<void> {
    if (this.running) {
      this.logger.warn('[CRON] skipped because previous worker execution is still running');
      return;
    }

    this.running = true;

    try {
      this.logger.log('[CRON] starting publication jobs worker');
      await this.service.execute();
      this.logger.log('[CRON] publication jobs worker finished');
    } catch (error) {
      this.logger.error('[CRON] publication jobs worker failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }
}
