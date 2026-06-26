import { Queue } from 'bullmq';
import { GoogleMerchantPublishProductJobData } from 'src/core/entitis/google-merchant/publish/GoogleMerchantPublishProductJob';
import { bullmqConnection } from './bullmq.connection';

export const GOOGLE_MERCHANT_PUBLISH_PRODUCTS_QUEUE_NAME = 'google-merchant-publish-products';
export const GOOGLE_MERCHANT_PUBLISH_PRODUCT_JOB_NAME = 'publish-product';

export const googleMerchantPublishProductsQueue = new Queue<GoogleMerchantPublishProductJobData>(
  GOOGLE_MERCHANT_PUBLISH_PRODUCTS_QUEUE_NAME,
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
