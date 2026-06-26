import { MadreGoogleMerchantActiveProduct } from 'src/core/entitis/madre-api/google-merchant/get/GoogleMerchantActiveProductsResponse';

export type EnqueueGoogleMerchantPublishProductInput = {
  runId: string;
  product: MadreGoogleMerchantActiveProduct;
  page: number;
  offset: number;
  limit: number;
};

export type EnqueueGoogleMerchantPublishProductResult = {
  productId: string;
  sku: string;
  jobId?: string;
};

export interface IGoogleMerchantPublishProductsQueue {
  enqueueProducts(
    products: EnqueueGoogleMerchantPublishProductInput[]
  ): Promise<EnqueueGoogleMerchantPublishProductResult[]>;
}
