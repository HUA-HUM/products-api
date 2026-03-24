import { Inject } from '@nestjs/common';
import { ICheckProductExistsRepository } from 'src/core/adapters/repositories/madre/Sync_items/CheckProductExists/ICheckProductExistsRepository';
import { ResolveMegatoneCategory } from './category/ResolveMegatoneCategory';
import { ResolveMegatoneBrand } from './brand/ResolveMegatoneBrand';
import { ResolveMegatonePrices } from './price/ResolveMegatonePrices';
import { BuildMegatonePayload } from './payload/BuildMegatonePayload';
import { ICreateMegatoneProductsRepository } from 'src/core/adapters/repositories/marketplace/megatone/CreateProducts/ICreateMegatoneProductsRepository';
import { IGetMadreProductsRepository } from 'src/core/adapters/repositories/madre/products/get/IGetMadreProductsRepository';

export type PublishResult = {
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  payload?: any;
  response?: any;
};

export class PublishMegatoneProduct {
  constructor(
    @Inject('ICheckProductExistsRepository')
    private readonly existsRepository: ICheckProductExistsRepository,

    @Inject('IGetMadreProductsRepository')
    private readonly madreRepository: IGetMadreProductsRepository,

    private readonly resolveCategory: ResolveMegatoneCategory,
    private readonly resolveBrand: ResolveMegatoneBrand,
    private readonly resolvePrices: ResolveMegatonePrices,
    private readonly buildPayload: BuildMegatonePayload,

    @Inject('ICreateMegatoneProductsRepository')
    private readonly publishRepository: ICreateMegatoneProductsRepository
  ) {}

  async execute(sku: string): Promise<PublishResult> {
    /* ======================================
     1. EXISTS
  ====================================== */
    const existsResponse = await this.existsRepository.exists({
      marketplace: 'megatone',
      sellerSku: sku
    });

    if (existsResponse.exists) {
      return this.buildValidationResult('skipped', 'PRODUCT_ALREADY_EXISTS', sku, 'exists_check');
    }

    /* ======================================
     2. GET PRODUCT
  ====================================== */
    const product = await this.madreRepository.getBySku(sku);

    if (!product) {
      return this.buildValidationResult('failed', 'PRODUCT_NOT_FOUND_IN_MADRE', sku, 'load_product');
    }

    /* ======================================
     2.5 MELI STATUS
  ====================================== */
    if (product.meliStatus !== 'active') {
      return this.buildValidationResult(
        'skipped',
        `MELI_STATUS_${product.meliStatus?.toUpperCase() || 'UNKNOWN'}`,
        sku,
        'meli_status_validation',
        {
          meliStatus: product.meliStatus ?? null
        }
      );
    }

    /* ======================================
     2.6 VALIDACIONES BASE
  ====================================== */

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

    /* ======================================
     3. CATEGORY
  ====================================== */
    const categoryId = await this.resolveCategory.execute({
      categoryId: product.categoryId,
      sku: product.sku
    });

    if (!categoryId) {
      return this.buildValidationResult('skipped', 'CATEGORY_NOT_FOUND', sku, 'category_resolution', {
        categoryId: product.categoryId ?? null
      });
    }

    /* ======================================
     4. BRAND
  ====================================== */
    const brandId = await this.resolveBrand.execute(product.attributes.brand);

    if (!brandId) {
      return this.buildValidationResult('skipped', 'BRAND_NOT_FOUND', sku, 'brand_resolution', {
        brand: product.attributes?.brand ?? null
      });
    }

    /* ======================================
     5. PRICES
  ====================================== */
    const prices = this.resolvePrices.execute(product.price);

    if (!prices) {
      return this.buildValidationResult('failed', 'PRICE_MAPPING_FAILED', sku, 'price_resolution', {
        price: product.price ?? null
      });
    }

    /* ======================================
     6. BUILD PAYLOAD
  ====================================== */
    const payload = this.buildPayload.execute({
      product,
      categoryId,
      brandId,
      prices
    });

    if (!payload) {
      return this.buildValidationResult('failed', 'PAYLOAD_BUILD_FAILED', sku, 'payload_build');
    }

    /* ======================================
     7. PUBLISH
  ====================================== */
    const response = await this.publishRepository.publish(payload);

    const item = response?.items?.[0];

    if (!item) {
      return {
        status: 'failed',
        message: 'MEGATONE_NO_RESPONSE_ITEM',
        payload,
        response
      };
    }

    /* ======================================
     SUCCESS
  ====================================== */
    if (!item.errors || item.errors.length === 0) {
      return {
        status: 'success',
        payload,
        response
      };
    }

    /* ======================================
     SKIP: YA EXISTE
  ====================================== */
    const errorMessage = item.errors?.[0]?.message || '';

    if (errorMessage.toLowerCase().includes('ya existe')) {
      return {
        status: 'skipped',
        message: 'ALREADY_EXISTS_IN_MEGATONE',
        payload,
        response
      };
    }

    /* ======================================
     FAILED
  ====================================== */
    return {
      status: 'failed',
      message: errorMessage || 'MEGATONE_UNKNOWN_ERROR',
      payload,
      response
    };
  }

  private buildValidationResult(
    status: 'success' | 'failed' | 'skipped',
    message: string,
    sku: string,
    stage: string,
    details?: Record<string, unknown>
  ): PublishResult {
    const context = {
      marketplace: 'megatone',
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
}
