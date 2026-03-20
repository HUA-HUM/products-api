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
         1. EXISTS (SYNC ITEMS)
      ====================================== */
      const exists = await this.existsRepository.exists({
        marketplace: 'fravega',
        sellerSku: sku
      });

      if (exists?.exists === true) {
        console.log(`[FRAVEGA] SKU ${sku} already exists → SKIPPED`);

        return {
          status: 'skipped',
          message: 'PRODUCT_ALREADY_EXISTS'
        };
      }

      /* ======================================
   2. GET PRODUCT (MADRE)
====================================== */
      const product = await this.madreRepository.getBySku(sku);

      if (!product) {
        console.error(`[FRAVEGA] SKU ${sku} not found in Madre`);

        return {
          status: 'failed',
          message: 'PRODUCT_NOT_FOUND_IN_MADRE'
        };
      }

      /* ======================================
   2.5 VALIDATION (MELI STATUS)
====================================== */
      if (product.meliStatus !== 'active') {
        console.warn(`[FRAVEGA] SKU ${sku} skipped → MELI status: ${product.meliStatus}`);

        return {
          status: 'skipped',
          message: `MELI_STATUS_${product.meliStatus?.toUpperCase() || 'UNKNOWN'}`
        };
      }

      /* ======================================
         3. CATEGORY
      ====================================== */
      const categoryId = await this.resolveCategory.execute({
        categoryId: (product as any).categoryId || (product as any).category_mla
      });

      if (!categoryId) {
        console.warn(`[FRAVEGA] SKU ${sku} missing category mapping`);

        return {
          status: 'skipped',
          message: 'CATEGORY_NOT_FOUND'
        };
      }

      /* ======================================
         4. BRAND
      ====================================== */
      const brandId = await this.resolveBrand.execute(product);

      /* ======================================
         5. ATTRIBUTES
      ====================================== */
      const attributes = await this.resolveAttributes.execute(categoryId, product);

      if (!attributes) {
        console.warn(`[FRAVEGA] SKU ${sku} missing required attributes`);

        return {
          status: 'skipped',
          message: 'MISSING_REQUIRED_ATTRIBUTES'
        };
      }

      /* ======================================
         6. PRICES
      ====================================== */
      const prices = this.resolvePrices.execute(product.price);

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

      /* ======================================
         8. PUBLISH
      ====================================== */
      const response = await this.createRepository.create(payload);

      /* ======================================
         9. MAP RESPONSE
      ====================================== */
      if (!response?.success) {
        console.error(`[FRAVEGA] SKU ${sku} FAILED`, response);

        return {
          status: 'failed',
          message: response?.message || 'FRAVEGA_API_ERROR',
          payload,
          response
        };
      }

      console.log(`[FRAVEGA] SKU ${sku} SUCCESS`);

      return {
        status: 'success',
        payload,
        response
      };
    } catch (error: any) {
      console.error(`[FRAVEGA] SKU ${sku} EXCEPTION`, error);

      return {
        status: 'failed',
        message: error?.message || 'UNEXPECTED_ERROR'
      };
    }
  }
}
