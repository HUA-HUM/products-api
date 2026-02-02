import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { importMarketplaceQueue } from 'src/app/driver/repository/redis/import-marketplace.queue';

export function setupBullBoard(app) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(importMarketplaceQueue)],
    serverAdapter
  });

  app.use('/admin/queues', serverAdapter.getRouter());
}
