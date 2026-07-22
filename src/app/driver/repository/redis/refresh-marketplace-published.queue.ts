import { Queue } from 'bullmq';
import { RefreshMarketplacePublishedItemJobData } from 'src/core/entitis/marketplace-changes/RefreshMarketplacePublishedItemJob';
import { bullmqConnection } from './bullmq.connection';

export const REFRESH_MARKETPLACE_PUBLISHED_QUEUE_NAME = 'refresh-marketplace-published';
export const REFRESH_MARKETPLACE_PUBLISHED_ITEM_JOB_NAME = 'refresh-published-item';

export const refreshMarketplacePublishedQueue = new Queue<RefreshMarketplacePublishedItemJobData>(
  REFRESH_MARKETPLACE_PUBLISHED_QUEUE_NAME,
  {
    connection: bullmqConnection,
    defaultJobOptions: {
      removeOnComplete: {
        age: 7 * 24 * 60 * 60,
        count: 5000
      },
      removeOnFail: {
        age: 14 * 24 * 60 * 60,
        count: 10000
      }
    }
  }
);
