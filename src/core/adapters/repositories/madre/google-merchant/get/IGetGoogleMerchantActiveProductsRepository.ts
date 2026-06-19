import {
  MadreGoogleMerchantActiveProduct,
  MadreGoogleMerchantActiveProductsResponse
} from 'src/core/entitis/madre-api/google-merchant/get/GoogleMerchantActiveProductsResponse';

export interface IGetGoogleMerchantActiveProductsRepository {
  listActive(limit?: number, offset?: number): Promise<MadreGoogleMerchantActiveProductsResponse>;
  getByAsin(asin: string): Promise<MadreGoogleMerchantActiveProduct | null>;
}
