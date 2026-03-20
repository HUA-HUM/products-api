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
      return {
        status: 'skipped',
        message: 'PRODUCT_ALREADY_EXISTS'
      };
    }

    /* ======================================
     2. GET PRODUCT
  ====================================== */
    const product = await this.madreRepository.getBySku(sku);

    if (!product) {
      return {
        status: 'failed',
        message: 'PRODUCT_NOT_FOUND_IN_MADRE'
      };
    }

    /* ======================================
     2.5 MELI STATUS
  ====================================== */
    if (product.meliStatus !== 'active') {
      return {
        status: 'skipped',
        message: `MELI_STATUS_${product.meliStatus?.toUpperCase() || 'UNKNOWN'}`
      };
    }

    /* ======================================
     2.6 VALIDACIONES BASE
  ====================================== */

    if (!product.price || product.price <= 0) {
      return {
        status: 'failed',
        message: 'INVALID_PRICE'
      };
    }

    if (!product.stock || product.stock <= 0) {
      return {
        status: 'skipped',
        message: 'OUT_OF_STOCK'
      };
    }

    if (!product.attributes?.brand) {
      return {
        status: 'skipped',
        message: 'MISSING_BRAND'
      };
    }

    /* ======================================
     3. CATEGORY
  ====================================== */
    const categoryId = await this.resolveCategory.execute({
      categoryId: product.categoryId,
      sku: product.sku
    });

    if (!categoryId) {
      return {
        status: 'skipped',
        message: 'CATEGORY_NOT_FOUND'
      };
    }

    /* ======================================
     4. BRAND
  ====================================== */
    const brandId = await this.resolveBrand.execute(product.attributes.brand);

    if (!brandId) {
      return {
        status: 'skipped',
        message: 'BRAND_NOT_FOUND'
      };
    }

    /* ======================================
     5. PRICES
  ====================================== */
    const prices = this.resolvePrices.execute(product.price);

    if (!prices) {
      return {
        status: 'failed',
        message: 'PRICE_MAPPING_FAILED'
      };
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
      return {
        status: 'failed',
        message: 'PAYLOAD_BUILD_FAILED'
      };
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
}
