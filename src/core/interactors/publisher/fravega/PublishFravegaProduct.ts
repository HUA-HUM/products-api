import { Inject } from '@nestjs/common';
import { ICheckProductExistsRepository } from 'src/core/adapters/repositories/madre/Sync_items/CheckProductExists/ICheckProductExistsRepository';
import { IGetMadreProductsRepository } from 'src/core/adapters/repositories/madre/products/get/IGetMadreProductsRepository';
import { ICreateFravegaProductsRepository } from 'src/core/adapters/repositories/marketplace/fravega/CreateProduct/ICreateFravegaProductsRepository';

import { ResolveFravegaCategory } from './category/ResolveFravegaCategory';
import { ResolveFravegaAttributes } from './atributtes/ResolveFravegaAttributes';
import { ResolveFravegaPrices } from './price/ResolveFravegaPrices';
import { BuildFravegaPayload } from './payload/BuildFravegaPayload';
import { ResolveFravegaBrand } from './brand/ResolveFravegaBrand';

export type PublishResult = {
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  payload?: any;
  response?: any;
};

export class PublishFravegaProduct {
  constructor(
    @Inject('ICheckProductExistsRepository')
    private readonly existsRepository: ICheckProductExistsRepository,

    @Inject('IGetMadreProductsRepository')
    private readonly madreRepository: IGetMadreProductsRepository,

    @Inject('ICreateFravegaProductsRepository')
    private readonly createRepository: ICreateFravegaProductsRepository,

    private readonly resolveCategory: ResolveFravegaCategory,
    private readonly resolveBrand: ResolveFravegaBrand,
    private readonly resolveAttributes: ResolveFravegaAttributes,
    private readonly resolvePrices: ResolveFravegaPrices,
    private readonly buildPayload: BuildFravegaPayload
  ) {}

  async execute(sku: string): Promise<PublishResult> {
    try {
      /* ======================================
       1. EXISTS
    ====================================== */
      const exists = await this.existsRepository.exists({
        marketplace: 'fravega',
        sellerSku: sku
      });

      if (exists?.exists) {
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

      if (!product.title || !product.description) {
        return {
          status: 'skipped',
          message: 'MISSING_TITLE_OR_DESCRIPTION'
        };
      }

      if (!product.images || product.images.length === 0) {
        return {
          status: 'skipped',
          message: 'MISSING_IMAGES'
        };
      }

      /* ======================================
       3. CATEGORY
    ====================================== */
      const categoryId = await this.resolveCategory.execute({
        categoryId: product.categoryId || (product as any).category_mla
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
      const brandId = await this.resolveBrand.execute(product);

      if (!brandId) {
        return {
          status: 'skipped',
          message: 'BRAND_NOT_FOUND'
        };
      }

      /* ======================================
       5. ATTRIBUTES
    ====================================== */
      const attributes = await this.resolveAttributes.execute(categoryId, product);

      if (!attributes) {
        return {
          status: 'skipped',
          message: 'MISSING_REQUIRED_ATTRIBUTES'
        };
      }

      /* ======================================
       6. PRICES
    ====================================== */
      const prices = this.resolvePrices.execute(product.price);

      if (!prices) {
        return {
          status: 'failed',
          message: 'PRICE_MAPPING_FAILED'
        };
      }

      /* ======================================
       7. BUILD PAYLOAD
    ====================================== */
      const payload = this.buildPayload.execute({
        product,
        categoryId,
        brandId,
        attributes,
        prices
      });

      if (!payload) {
        return {
          status: 'failed',
          message: 'PAYLOAD_BUILD_FAILED'
        };
      }

      /* ======================================
       8. PUBLISH
    ====================================== */
      const response = await this.createRepository.create(payload);

      if (!response?.success) {
        return {
          status: 'failed',
          message: response?.message || 'FRAVEGA_API_ERROR',
          payload,
          response
        };
      }

      /* ======================================
       SUCCESS
    ====================================== */
      return {
        status: 'success',
        payload,
        response
      };
    } catch (error: any) {
      return {
        status: 'failed',
        message: error?.message || 'UNEXPECTED_ERROR'
      };
    }
  }
}
