import { DeleteGoogleMerchantProductResponse } from 'src/core/entitis/marketplace-api/google-merchant/products/delete/DeleteGoogleMerchantProductResponse';

export interface IDeleteGoogleMerchantProductRepository {
  execute(sku: string): Promise<DeleteGoogleMerchantProductResponse>;
}
