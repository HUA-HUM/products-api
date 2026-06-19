import { Injectable } from '@nestjs/common';
import { IDeleteGoogleMerchantProductRepository } from 'src/core/adapters/repositories/marketplace/google-merchant/products/delete/IDeleteGoogleMerchantProductRepository';
import { DeleteGoogleMerchantProductResponse } from 'src/core/entitis/marketplace-api/google-merchant/products/delete/DeleteGoogleMerchantProductResponse';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';

@Injectable()
export class DeleteGoogleMerchantProductRepository implements IDeleteGoogleMerchantProductRepository {
  constructor(private readonly httpClient: MarketplaceHttpClient) {}

  async execute(sku: string): Promise<DeleteGoogleMerchantProductResponse> {
    if (!sku?.trim()) {
      throw new Error('sku is required');
    }

    return this.httpClient.delete<DeleteGoogleMerchantProductResponse>(
      `/internal/google-merchant/products/${encodeURIComponent(sku.trim())}`
    );
  }
}
