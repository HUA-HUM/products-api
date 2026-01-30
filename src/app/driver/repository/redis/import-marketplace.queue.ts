import { Queue } from 'bullmq';
import { bullmqConnection } from './bullmq.connection';

export const IMPORT_MARKETPLACE_QUEUE_NAME = 'import-marketplace';

export const importMarketplaceQueue = new Queue(IMPORT_MARKETPLACE_QUEUE_NAME, {
  connection: bullmqConnection
});
