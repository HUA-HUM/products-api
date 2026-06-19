import { DeleteGoogleMerchantProductResponse } from 'src/core/entitis/marketplace-api/google-merchant/products/delete/DeleteGoogleMerchantProductResponse';

export interface IDeleteGoogleMerchantProductRepository {
  execute(params: {
    offerId: string;
    contentLanguage: string;
    feedLabel: string;
  }): Promise<DeleteGoogleMerchantProductResponse>;
}
