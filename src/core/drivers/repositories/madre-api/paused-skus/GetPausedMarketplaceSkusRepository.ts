import { Injectable } from '@nestjs/common';
import {
  IGetPausedMarketplaceSkusRepository,
  PausedMarketplaceSkusResponse
} from 'src/core/adapters/repositories/madre/paused-skus/IGetPausedMarketplaceSkusRepository';
import { MadreHttpClient } from '../http/MadreHttpClient';

@Injectable()
export class GetPausedMarketplaceSkusRepository implements IGetPausedMarketplaceSkusRepository {
  private readonly internalApiKey = process.env.MADRE_INTERNAL_API_KEY ?? process.env.INTERNAL_API_KEY;

  constructor(private readonly httpClient: MadreHttpClient) {}

  async getPausedSkus(skus: string[]): Promise<PausedMarketplaceSkusResponse> {
    if (!Array.isArray(skus) || skus.length === 0) {
      return {
        items: [],
        total: 0
      };
    }

    return this.httpClient.post<PausedMarketplaceSkusResponse>(
      '/internal/marketplace/products/paused-skus/bulk',
      {
        skus
      },
      this.getRequestOptions()
    );
  }

  private getRequestOptions() {
    if (!this.internalApiKey) {
      throw new Error('MADRE_INTERNAL_API_KEY or INTERNAL_API_KEY is not defined');
    }

    return {
      headers: {
        'x-internal-api-key': this.internalApiKey
      }
    };
  }
}
