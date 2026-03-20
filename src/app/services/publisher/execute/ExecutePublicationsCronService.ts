import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ExecutePublicationsService } from './ExecutePublicationsService';

const TEN_MINUTES_MS = 10 * 60 * 1000;

@Injectable()
export class ExecutePublicationsCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExecutePublicationsCronService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly service: ExecutePublicationsService) {}

  onModuleInit(): void {
    if (!this.isEnabled()) {
      this.logger.log('[CRON] publications execute disabled');
      return;
    }

    this.logger.log('[CRON] publications execute scheduled every 10 minutes');

    this.timer = setInterval(() => {
      void this.runScheduled();
    }, TEN_MINUTES_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async runScheduled(): Promise<void> {
    if (this.running) {
      this.logger.warn('[CRON] skipped because previous execution is still running');
      return;
    }

    const folderId = this.getFolderId();
    const marketplaces = this.getMarketplaces();

    if (!folderId || marketplaces.length === 0) {
      this.logger.warn('[CRON] missing PUBLICATIONS_CRON_FOLDER_ID or PUBLICATIONS_CRON_MARKETPLACES');
      return;
    }

    this.running = true;

    try {
      this.logger.log(`[CRON] starting execute publications | folderId=${folderId} | marketplaces=${marketplaces.join(',')}`);
      await this.service.run({
        folderId,
        marketplaces
      });
      this.logger.log('[CRON] execute publications finished');
    } catch (error) {
      this.logger.error('[CRON] execute publications failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }

  private isEnabled(): boolean {
    return process.env.PUBLICATIONS_CRON_ENABLED === 'true';
  }

  private getFolderId(): number | null {
    const rawFolderId = process.env.PUBLICATIONS_CRON_FOLDER_ID;

    if (!rawFolderId) {
      return null;
    }

    const folderId = Number(rawFolderId);
    return Number.isInteger(folderId) && folderId > 0 ? folderId : null;
  }

  private getMarketplaces(): string[] {
    return (process.env.PUBLICATIONS_CRON_MARKETPLACES ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
  }
}
