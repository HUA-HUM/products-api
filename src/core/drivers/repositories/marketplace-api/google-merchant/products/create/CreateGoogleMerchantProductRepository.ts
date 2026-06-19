import { Injectable } from '@nestjs/common';
import { ICreateGoogleMerchantProductRepository } from 'src/core/adapters/repositories/marketplace/google-merchant/products/create/ICreateGoogleMerchantProductRepository';
import {
  CreateGoogleMerchantProductRequest,
  CreateGoogleMerchantProductResponse
} from 'src/core/entitis/marketplace-api/google-merchant/products/create/CreateGoogleMerchantProductRequest';
import { MarketplaceHttpClient } from '../../../http/MarketplaceHttpClient';

@Injectable()
export class CreateGoogleMerchantProductRepository implements ICreateGoogleMerchantProductRepository {
  constructor(private readonly httpClient: MarketplaceHttpClient) {}

  async create(body: CreateGoogleMerchantProductRequest): Promise<CreateGoogleMerchantProductResponse> {
    try {
      const response = await this.httpClient.post<any>('/internal/google-merchant/products', body);

      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
      const details = error?.response ?? error?.data ?? null;
      const detailMessage = this.extractDetailMessage(details);

      return {
        success: false,
        message: [
          error?.message ?? 'GOOGLE_MERCHANT_CREATE_ERROR',
          statusCode ? `statusCode=${statusCode}` : null,
          detailMessage
        ]
          .filter(Boolean)
          .join(' | '),
        statusCode,
        details,
        error
      };
    }
  }

  private extractDetailMessage(details: unknown): string | null {
    if (!details) {
      return null;
    }

    if (typeof details === 'string') {
      return details;
    }

    if (typeof details !== 'object') {
      return null;
    }

    const record = details as Record<string, unknown>;
    const candidates = ['message', 'error', 'details', 'detail'];
    const messages: string[] = [];

    for (const key of candidates) {
      const value = record[key];

      if (typeof value === 'string' && value.trim()) {
        messages.push(value.trim());
      }
    }

    if (Array.isArray(record.errors)) {
      for (const item of record.errors) {
        if (typeof item === 'string' && item.trim()) {
          messages.push(item.trim());
          continue;
        }

        if (item && typeof item === 'object') {
          const message = (item as Record<string, unknown>).message;

          if (typeof message === 'string' && message.trim()) {
            messages.push(message.trim());
          }
        }
      }
    }

    if (messages.length > 0) {
      return messages.join(' | ');
    }

    return JSON.stringify(details);
  }
}
