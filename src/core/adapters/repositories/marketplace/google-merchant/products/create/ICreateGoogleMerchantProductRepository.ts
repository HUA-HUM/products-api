import {
  CreateGoogleMerchantProductRequest,
  CreateGoogleMerchantProductResponse
} from 'src/core/entitis/marketplace-api/google-merchant/products/create/CreateGoogleMerchantProductRequest';

export interface ICreateGoogleMerchantProductRepository {
  create(body: CreateGoogleMerchantProductRequest): Promise<CreateGoogleMerchantProductResponse>;
}
