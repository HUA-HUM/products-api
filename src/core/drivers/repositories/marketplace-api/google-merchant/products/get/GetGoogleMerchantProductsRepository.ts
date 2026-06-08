import { Injectable } from '@nestjs/common';
import { IGetGoogleMerchantProductsRepository } from 'src/core/adapters/repositories/marketplace/google-merchant/products/get/IGetGoogleMerchantProductsRepository';
import { GoogleMerchantProductsPaginatedResponse } from 'src/core/entitis/marketplace-api/google-merchant/products/get/GoogleMerchantProductsPaginatedResponse';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';

@Injectable()
export class GetGoogleMerchantProductsRepository implements IGetGoogleMerchantProductsRepository {
  constructor(private readonly httpClient: MarketplaceHttpClient) {}

  async execute(pageSize: number, pageToken?: string): Promise<GoogleMerchantProductsPaginatedResponse> {
    return this.httpClient.get<GoogleMerchantProductsPaginatedResponse>('/internal/google-merchant/products', {
      pageSize,
      ...(pageToken ? { pageToken } : {})
    });
  }
}
