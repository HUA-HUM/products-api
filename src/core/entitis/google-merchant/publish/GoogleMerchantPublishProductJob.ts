import { MadreGoogleMerchantActiveProduct } from 'src/core/entitis/madre-api/google-merchant/get/GoogleMerchantActiveProductsResponse';

export type GoogleMerchantPublishProductJobData = {
  runId: string;
  product: MadreGoogleMerchantActiveProduct;
  source: {
    page: number;
    offset: number;
    limit: number;
  };
  queuedAt: string;
};
