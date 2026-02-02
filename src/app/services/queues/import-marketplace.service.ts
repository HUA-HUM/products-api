import { Inject, Injectable } from '@nestjs/common';
import {
  IMPORT_MARKETPLACE_QUEUE_NAME,
  importMarketplaceQueue
} from 'src/app/driver/repository/redis/import-marketplace.queue';

import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { IGetProductSyncRunsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncRunsRepository';

@Injectable()
export class ImportMarketplaceService {
  constructor(
    @Inject('IGetProductSyncRunsRepository')
    private readonly runsRepo: IGetProductSyncRunsRepository
  ) {}

  async enqueueImport(marketplace: ProductSyncMarketplace) {
    const runs = await this.runsRepo.getRuns({
      marketplace,
      offset: 0,
      limit: 5
    });

    const isRunning = runs.items.some(run => run.status === 'RUNNING');

    if (isRunning) {
      return { accepted: false, reason: 'ALREADY_RUNNING' };
    }

    await importMarketplaceQueue.add(
      IMPORT_MARKETPLACE_QUEUE_NAME,
      {
        marketplace,
        meta: {
          requestedAt: new Date().toISOString(),
          requestedAtLocal: new Date().toLocaleString('es-AR'),
          triggeredBy: 'manual'
        }
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 }
      }
    );
    return { accepted: true };
  }
}
