import { GoogleMerchantProductsPaginatedResponse } from 'src/core/entitis/marketplace-api/google-merchant/products/get/GoogleMerchantProductsPaginatedResponse';

export interface IGetGoogleMerchantProductsRepository {
  execute(pageSize: number, pageToken?: string): Promise<GoogleMerchantProductsPaginatedResponse>;
}
