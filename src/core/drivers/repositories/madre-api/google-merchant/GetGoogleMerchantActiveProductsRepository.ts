import { Injectable } from '@nestjs/common';
import { MadreHttpClient } from '../http/MadreHttpClient';
import { IGetGoogleMerchantActiveProductsRepository } from 'src/core/adapters/repositories/madre/google-merchant/get/IGetGoogleMerchantActiveProductsRepository';
import {
  MadreGoogleMerchantActiveProduct,
  MadreGoogleMerchantActiveProductsResponse
} from 'src/core/entitis/madre-api/google-merchant/get/GoogleMerchantActiveProductsResponse';

@Injectable()
export class GetGoogleMerchantActiveProductsRepository implements IGetGoogleMerchantActiveProductsRepository {
  private readonly internalApiKey = process.env.MADRE_INTERNAL_API_KEY ?? process.env.INTERNAL_API_KEY;

  constructor(private readonly httpClient: MadreHttpClient) {}

  async listActive(limit = 50, offset = 0): Promise<MadreGoogleMerchantActiveProductsResponse> {
    const response = await this.httpClient.get<unknown>(
      '/internal/google-merchant/products/active',
      {
        limit,
        offset
      },
      this.getRequestOptions()
    );

    return this.normalizeResponse(response, limit, offset);
  }

  async getByAsin(asin: string): Promise<MadreGoogleMerchantActiveProduct | null> {
    const response = await this.listActive(1, 0);
    return response.items.find(item => item.asin === asin) ?? null;
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

  private normalizeResponse(response: unknown, limit: number, offset: number): MadreGoogleMerchantActiveProductsResponse {
    const body = (response ?? {}) as
      | MadreGoogleMerchantActiveProduct[]
      | {
          items?: MadreGoogleMerchantActiveProduct[];
          data?: MadreGoogleMerchantActiveProduct[];
          products?: MadreGoogleMerchantActiveProduct[];
          limit?: number;
          offset?: number;
          count?: number;
          total?: number;
          totalItems?: number;
          totalCount?: number;
          hasNext?: boolean;
          nextOffset?: number | null;
        };

    const items = Array.isArray(body) ? body : (body.items ?? body.data ?? body.products ?? []);
    const count = Array.isArray(body) ? items.length : (body.count ?? items.length);
    const explicitTotal = Array.isArray(body) ? null : (body.total ?? body.totalItems ?? body.totalCount ?? null);
    const total = explicitTotal ?? offset + count;
    const hasNext = Array.isArray(body) ? count >= limit : (body.hasNext ?? (explicitTotal !== null ? offset + count < total : count >= limit));
    const nextOffset = hasNext ? (Array.isArray(body) ? offset + count : (body.nextOffset ?? offset + count)) : null;

    return {
      items,
      limit: Array.isArray(body) ? limit : (body.limit ?? limit),
      offset: Array.isArray(body) ? offset : (body.offset ?? offset),
      count,
      total,
      hasNext,
      nextOffset
    };
  }
}
