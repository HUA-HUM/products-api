import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { googleMerchantPublishProductsQueue } from 'src/app/driver/repository/redis/google-merchant-publish-products.queue';
import { importMarketplaceQueue } from 'src/app/driver/repository/redis/import-marketplace.queue';

export function setupBullBoard(app) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(importMarketplaceQueue), new BullMQAdapter(googleMerchantPublishProductsQueue)],
    serverAdapter
  });

  app.use('/admin/queues', serverAdapter.getRouter());
}
