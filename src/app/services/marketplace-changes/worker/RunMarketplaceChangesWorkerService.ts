import { Injectable, Logger } from '@nestjs/common';
import { RunMarketplaceChanges } from 'src/core/interactors/marketplace-changes/run/RunMarketplaceChanges';

@Injectable()
export class RunMarketplaceChangesWorkerService {
  private readonly logger = new Logger(RunMarketplaceChangesWorkerService.name);
  private readonly DEFAULT_LIMIT = 50;
  private readonly DEFAULT_SYNC_KEY = 'marketplace-changes';

  constructor(private readonly runMarketplaceChanges: RunMarketplaceChanges) {}

  async execute(): Promise<void> {
    const limit = Math.max(1, Number(process.env.MARKETPLACE_CHANGES_CRON_LIMIT ?? this.DEFAULT_LIMIT));
    const maxPages = this.parseOptionalPositiveInt(process.env.MARKETPLACE_CHANGES_CRON_MAX_PAGES);
    const syncKey = process.env.MARKETPLACE_CHANGES_SYNC_KEY ?? this.DEFAULT_SYNC_KEY;

    this.logger.log(
      `[WORKER] starting marketplace changes sync | limit=${limit} | maxPages=${maxPages ?? 'all'} | syncKey=${syncKey}`
    );

    const summary = await this.runMarketplaceChanges.execute({
      limit,
      maxPages: maxPages ?? undefined,
      syncKey,
      useCursor: true,
      saveCursor: true
    });

    this.logger.log(
      `[WORKER] marketplace changes sync finished | pages=${summary.pagesProcessed} | fetched=${summary.itemsFetched} | processed=${summary.itemsProcessed} | afterIdStarted=${summary.afterIdStarted} | afterIdFinished=${summary.afterIdFinished} | hasMore=${summary.hasMore} | success=${summary.counts.SUCCESS} | partial=${summary.counts.PARTIAL} | failed=${summary.counts.FAILED}`
    );
  }

  private parseOptionalPositiveInt(value?: string): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return Math.trunc(parsed);
  }
}
