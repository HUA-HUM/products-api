import { Inject, Injectable } from '@nestjs/common';
import { ICheckProductExistsRepository } from 'src/core/adapters/repositories/madre/Sync_items/CheckProductExists/ICheckProductExistsRepository';
import { IGetMadreProductsRepository } from 'src/core/adapters/repositories/madre/products/get/IGetMadreProductsRepository';
import { ICreateOnCityProductsRepository } from 'src/core/adapters/repositories/marketplace/oncity/CreateProducts/ICreateOnCityProductsRepository';
import { ResolveOnCityBrand } from './brand/ResolveOnCityBrand';
import { ResolveOnCityCategory } from './category/ResolveOnCityCategory';
import { BuildOnCityPayload } from './payload/BuildOnCityPayload';
import { ResolveOnCityPrices } from './price/ResolveOnCityPrices';

export type PublishResult = {
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  payload?: any;
  response?: any;
};

@Injectable()
export class PublishOncityProduct {
  constructor(
    @Inject('ICheckProductExistsRepository')
    private readonly existsRepository: ICheckProductExistsRepository,

    @Inject('IGetMadreProductsRepository')
    private readonly madreRepository: IGetMadreProductsRepository,

    @Inject('ICreateOnCityProductsRepository')
    private readonly createRepository: ICreateOnCityProductsRepository,

    private readonly resolveCategory: ResolveOnCityCategory,
    private readonly resolveBrand: ResolveOnCityBrand,
    private readonly resolvePrices: ResolveOnCityPrices,
    private readonly buildPayload: BuildOnCityPayload
  ) {}

  async execute(sku: string): Promise<PublishResult> {
    try {
      const exists = await this.existsRepository.exists({
        marketplace: 'oncity',
        sellerSku: sku
      });

      if (exists?.exists) {
        return this.buildValidationResult('skipped', 'PRODUCT_ALREADY_EXISTS', sku, 'exists_check');
      }

      const product = await this.madreRepository.getBySku(sku);

      if (!product) {
        return this.buildValidationResult('failed', 'PRODUCT_NOT_FOUND_IN_MADRE', sku, 'load_product');
      }

      if (product.status !== 'active') {
        return this.buildValidationResult(
          'skipped',
          `PRODUCT_STATUS_${product.status?.toUpperCase() || 'UNKNOWN'}`,
          sku,
          'status_validation',
          {
            status: product.status ?? null
          }
        );
      }

      if (!product.price || product.price <= 0) {
        return this.buildValidationResult('failed', 'INVALID_PRICE', sku, 'base_validation', {
          price: product.price ?? null
        });
      }

      if (!product.stock || product.stock <= 0) {
        return this.buildValidationResult('skipped', 'OUT_OF_STOCK', sku, 'base_validation', {
          stock: product.stock ?? null
        });
      }

      if (!product.attributes?.brand) {
        return this.buildValidationResult('skipped', 'MISSING_BRAND', sku, 'base_validation');
      }

      if (!product.title || !product.description) {
        return this.buildValidationResult('skipped', 'MISSING_TITLE_OR_DESCRIPTION', sku, 'base_validation', {
          hasTitle: Boolean(product.title),
          hasDescription: Boolean(product.description)
        });
      }

      const prices = this.resolvePrices.execute(product.price);

      const categoryCandidates = await this.resolveCategory.executeCandidates(product, 5);
      const categoryId = categoryCandidates[0] ?? null;

      if (!categoryId) {
        return this.buildValidationResult('skipped', 'CATEGORY_NOT_FOUND', sku, 'category_resolution', {
          madreCategoryId: product.categoryId ?? null,
          categoryPath: product.categoryPath ?? null
        });
      }

      const brandId = await this.resolveBrand.execute(product);

      if (!brandId) {
        return this.buildValidationResult('failed', 'BRAND_NOT_FOUND', sku, 'brand_resolution', {
          brand: product.attributes?.brand ?? null
        });
      }

      const payload = this.buildPayload.execute({
        product,
        brandId,
        categoryIds: [categoryId]
      });

      if (!payload) {
        return this.buildValidationResult('failed', 'PAYLOAD_BUILD_FAILED', sku, 'payload_build');
      }

      const response = await this.createRepository.createProduct(payload);

      if (!response?.success) {
        const errorMessage = this.extractErrorMessage(response?.raw) || response?.message || 'ONCITY_API_ERROR';

        if (this.isAlreadyExistsResponse(response?.raw, errorMessage)) {
          return {
            status: 'skipped',
            message: 'ALREADY_EXISTS_IN_ONCITY',
            payload: {
              request: payload,
              prices
            },
            response
          };
        }

        return {
          status: 'failed',
          message: errorMessage,
          payload: {
            request: payload,
            prices
          },
          response
        };
      }

      return {
        status: 'success',
        payload: {
          request: payload,
          prices
        },
        response
      };
    } catch (error: any) {
      return this.buildValidationResult('failed', error?.message || 'UNEXPECTED_ERROR', sku, 'unexpected_error');
    }
  }

  private buildValidationResult(
    status: 'success' | 'failed' | 'skipped',
    message: string,
    sku: string,
    stage: string,
    details?: Record<string, unknown>
  ): PublishResult {
    const context = {
      marketplace: 'oncity',
      sku,
      stage,
      reason: message,
      details: details ?? null
    };

    return {
      status,
      message,
      payload: context,
      response: context
    };
  }

  private extractErrorMessage(raw: unknown): string {
    if (!raw) {
      return '';
    }

    if (typeof raw === 'string') {
      return raw;
    }

    if (typeof raw !== 'object') {
      return '';
    }

    const record = raw as Record<string, unknown>;
    const messages: string[] = [];
    const candidates = ['message', 'Message', 'error', 'Error'];

    for (const key of candidates) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        messages.push(value.trim());
      }
    }

    if (Array.isArray(record.errors)) {
      for (const error of record.errors) {
        if (error && typeof error === 'object') {
          const message = (error as Record<string, unknown>).message;
          if (typeof message === 'string' && message.trim()) {
            messages.push(message.trim());
          }
        }
      }
    }

    return messages.join(' | ');
  }

  private isAlreadyExistsError(message: string): boolean {
    const normalized = message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return normalized.includes('already exists') || normalized.includes('ya existe') || normalized.includes('duplicate');
  }

  private isAlreadyExistsResponse(raw: unknown, message: string): boolean {
    if (this.isAlreadyExistsError(message)) {
      return true;
    }

    if (!raw || typeof raw !== 'object') {
      return false;
    }

    const record = raw as Record<string, unknown>;
    return Number(record.statusCode) === 409;
  }
}
