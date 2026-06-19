import { Injectable } from '@nestjs/common';
import { IDeleteGoogleMerchantProductRepository } from 'src/core/adapters/repositories/marketplace/google-merchant/products/delete/IDeleteGoogleMerchantProductRepository';
import { DeleteGoogleMerchantProductResponse } from 'src/core/entitis/marketplace-api/google-merchant/products/delete/DeleteGoogleMerchantProductResponse';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';

@Injectable()
export class DeleteGoogleMerchantProductRepository implements IDeleteGoogleMerchantProductRepository {
  constructor(private readonly httpClient: MarketplaceHttpClient) {}

  async execute(params: {
    offerId: string;
    contentLanguage: string;
    feedLabel: string;
  }): Promise<DeleteGoogleMerchantProductResponse> {
    const offerId = params.offerId?.trim();
    const contentLanguage = params.contentLanguage?.trim();
    const feedLabel = params.feedLabel?.trim();

    if (!offerId) {
      throw new Error('offerId is required');
    }

    if (!contentLanguage) {
      throw new Error('contentLanguage is required');
    }

    if (!feedLabel) {
      throw new Error('feedLabel is required');
    }

    return this.httpClient.delete<DeleteGoogleMerchantProductResponse>(
      `/internal/google-merchant/products/${encodeURIComponent(offerId)}?contentLanguage=${encodeURIComponent(contentLanguage)}&feedLabel=${encodeURIComponent(feedLabel)}`
    );
  }
}
