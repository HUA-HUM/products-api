import { Injectable, Logger } from '@nestjs/common';
import { ChangeProcessingResult } from 'src/core/entitis/marketplace-changes/ChangeProcessingResult';
import { GetPendingMarketplaceChanges } from 'src/core/interactors/marketplace-changes/source/GetPendingMarketplaceChanges';
import { ProcessMarketplaceChanges } from 'src/core/interactors/marketplace-changes/process/ProcessMarketplaceChanges';

export type RunMarketplaceChangesInput = {
  afterId?: number;
  limit?: number;
  maxPages?: number;
  useCursor?: boolean;
  saveCursor?: boolean;
  syncKey?: string;
};

export type RunMarketplaceChangesSummary = {
  pagesProcessed: number;
  itemsFetched: number;
  itemsProcessed: number;
  afterIdStarted: number;
  afterIdFinished: number;
  hasMore: boolean;
  counts: {
    SUCCESS: number;
    PARTIAL: number;
    FAILED: number;
  };
};

@Injectable()
export class RunMarketplaceChanges {
  private readonly logger = new Logger(RunMarketplaceChanges.name);
  private readonly DEFAULT_LIMIT = 50;
  private readonly DEFAULT_SYNC_KEY = 'marketplace-changes';

  constructor(
    private readonly getPendingMarketplaceChanges: GetPendingMarketplaceChanges,
    private readonly processMarketplaceChanges: ProcessMarketplaceChanges
  ) {}

  async execute(input: RunMarketplaceChangesInput = {}): Promise<RunMarketplaceChangesSummary> {
    const limit = Math.max(1, input.limit ?? this.DEFAULT_LIMIT);
    const maxPages = input.maxPages ? Math.max(1, input.maxPages) : null;
    const syncKey = input.syncKey ?? this.DEFAULT_SYNC_KEY;
    const shouldUseCursor = input.useCursor ?? input.afterId === undefined;
    const shouldSaveCursor = input.saveCursor ?? shouldUseCursor;

    let afterId = input.afterId ?? 0;
    let pagesProcessed = 0;
    let itemsFetched = 0;
    let itemsProcessed = 0;
    let hasMore = false;

    const counts = {
      SUCCESS: 0,
      PARTIAL: 0,
      FAILED: 0
    };

    if (shouldUseCursor) {
      const cursor = await this.getPendingMarketplaceChanges.getCursor(syncKey);
      afterId = cursor?.lastDeltaId ?? afterId;
      this.logger.log(`[MKT-CHANGES] Using cursor | syncKey=${syncKey} afterId=${afterId}`);
    }

    const afterIdStarted = afterId;

    do {
      const page = await this.getPendingMarketplaceChanges.execute({
        afterId,
        limit
      });

      pagesProcessed += 1;
      itemsFetched += page.items.length;
      hasMore = page.hasMore === true;

      this.logger.log(
        `[MKT-CHANGES] Page fetched | page=${pagesProcessed} afterId=${afterId} items=${page.items.length} lastId=${page.lastId ?? 'null'} hasMore=${hasMore}`
      );

      if (page.items.length > 0) {
        const results = await this.processMarketplaceChanges.processPage(page.items);
        this.accumulateResults(results, counts);
        itemsProcessed += results.length;
      }

      if (typeof page.lastId === 'number') {
        afterId = page.lastId;
      }

      if (!hasMore) {
        break;
      }
    } while (maxPages === null || pagesProcessed < maxPages);

    if (shouldSaveCursor) {
      await this.getPendingMarketplaceChanges.saveCursor({
        syncKey,
        lastDeltaId: afterId
      });

      this.logger.log(`[MKT-CHANGES] Cursor saved | syncKey=${syncKey} lastDeltaId=${afterId}`);
    }

    return {
      pagesProcessed,
      itemsFetched,
      itemsProcessed,
      afterIdStarted,
      afterIdFinished: afterId,
      hasMore,
      counts
    };
  }

  private accumulateResults(results: ChangeProcessingResult[], counts: RunMarketplaceChangesSummary['counts']): void {
    for (const result of results) {
      counts[result.overall] += 1;
    }
  }
}
