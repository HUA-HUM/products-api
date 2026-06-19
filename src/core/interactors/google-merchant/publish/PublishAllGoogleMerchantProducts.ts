import { Inject, Injectable, Logger } from '@nestjs/common';
import { IGetGoogleMerchantActiveProductsRepository } from 'src/core/adapters/repositories/madre/google-merchant/get/IGetGoogleMerchantActiveProductsRepository';
import { ISendBulkProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/ISendBulkProductSyncRepository';
import { ICreateGoogleMerchantProductRepository } from 'src/core/adapters/repositories/marketplace/google-merchant/products/create/ICreateGoogleMerchantProductRepository';
import { MadreGoogleMerchantActiveProduct } from 'src/core/entitis/madre-api/google-merchant/get/GoogleMerchantActiveProductsResponse';
import { BulkMarketplaceProductsDto } from 'src/core/entitis/madre-api/product-sync/dto/BulkMarketplaceProductsDto';
import { CreateGoogleMerchantProductRequest } from 'src/core/entitis/marketplace-api/google-merchant/products/create/CreateGoogleMerchantProductRequest';

export type PublishAllGoogleMerchantProductsInput = {
  limit?: number;
  offset?: number;
  maxPages?: number;
};

export type PublishAllGoogleMerchantProductsSummary = {
  pagesProcessed: number;
  itemsFetched: number;
  published: {
    success: number;
    failed: number;
  };
  sync: {
    success: number;
    failed: number;
  };
  hasNext: boolean;
  nextOffset: number | null;
  failures: Array<{
    sku: string;
    error: string;
    statusCode?: number;
    details?: unknown;
  }>;
  syncFailures: Array<{
    sku: string;
    error: string;
  }>;
};

@Injectable()
export class PublishAllGoogleMerchantProducts {
  private readonly logger = new Logger(PublishAllGoogleMerchantProducts.name);
  private readonly PRODUCT_BASE_URL =
    process.env.GOOGLE_MERCHANT_PRODUCT_BASE_URL ?? 'https://loquieroaca.com/products';
  private readonly IMAGE_BASE_URL =
    process.env.GOOGLE_MERCHANT_IMAGE_BASE_URL ?? 'https://images-na.ssl-images-amazon.com/images/I';

  constructor(
    @Inject('IGetGoogleMerchantActiveProductsRepository')
    private readonly getActiveProducts: IGetGoogleMerchantActiveProductsRepository,

    @Inject('ICreateGoogleMerchantProductRepository')
    private readonly createGoogleMerchantProduct: ICreateGoogleMerchantProductRepository,

    @Inject('ISendBulkProductSyncRepository')
    private readonly sendBulkProductSync: ISendBulkProductSyncRepository
  ) {}

  async execute(input: PublishAllGoogleMerchantProductsInput = {}): Promise<PublishAllGoogleMerchantProductsSummary> {
    const limit = Math.max(1, input.limit ?? 50);
    const maxPages = input.maxPages ? Math.max(1, input.maxPages) : null;

    let offset = Math.max(0, input.offset ?? 0);
    let pagesProcessed = 0;
    let itemsFetched = 0;
    let hasNext = false;
    let nextOffset: number | null = null;

    const summary: PublishAllGoogleMerchantProductsSummary = {
      pagesProcessed: 0,
      itemsFetched: 0,
      published: {
        success: 0,
        failed: 0
      },
      sync: {
        success: 0,
        failed: 0
      },
      hasNext: false,
      nextOffset: null,
      failures: [],
      syncFailures: []
    };

    this.logger.log(
      `[GOOGLE-MERCHANT][PUBLISH] started | offset=${offset} | limit=${limit} | maxPages=${maxPages ?? 'all'}`
    );

    do {
      const page = await this.getActiveProducts.listActive(limit, offset);

      pagesProcessed += 1;
      itemsFetched += page.items.length;
      hasNext = page.hasNext;
      nextOffset = page.nextOffset;

      this.logger.log(
        `[GOOGLE-MERCHANT][PUBLISH] page fetched | page=${pagesProcessed} | offset=${offset} | count=${page.items.length} | hasNext=${hasNext}`
      );

      if (page.items.length === 0) {
        break;
      }

      for (const product of page.items) {
        const payload = this.buildPayload(product);

        if (!payload) {
          summary.published.failed += 1;
          this.logger.warn(
            `[GOOGLE-MERCHANT][PUBLISH] payload skipped | productId=${product.id ?? '-'} | sku=${product.asin ?? '-'} | reason=unable_to_build_payload`
          );
          summary.failures.push({
            sku: String(product.asin ?? product.id ?? 'unknown'),
            error: 'unable to build payload'
          });
          continue;
        }

        this.logger.log(
          `[GOOGLE-MERCHANT][PUBLISH] publishing | productId=${product.id} | sku=${payload.sku} | price=${payload.price} | stock=${payload.stock}`
        );

        const response = await this.createGoogleMerchantProduct.create(payload);

        if (response.success) {
          summary.published.success += 1;
          this.logger.log(`[GOOGLE-MERCHANT][PUBLISH] published | productId=${product.id} | sku=${payload.sku}`);

          const syncResult = await this.savePublishedProductInSyncItems(product, payload, response.data);

          if (syncResult.success) {
            summary.sync.success += 1;
            this.logger.log(`[GOOGLE-MERCHANT][SYNC] saved | productId=${product.id} | sku=${payload.sku}`);
          } else {
            summary.sync.failed += 1;
            this.logger.error(
              `[GOOGLE-MERCHANT][SYNC] failed | productId=${product.id} | sku=${payload.sku} | reason=${syncResult.error}`
            );
            summary.syncFailures.push({
              sku: payload.sku,
              error: syncResult.error
            });
          }

          continue;
        }

        summary.published.failed += 1;
        const failureMessage = response.message ?? 'GOOGLE_MERCHANT_CREATE_ERROR';
        this.logger.error(
          `[GOOGLE-MERCHANT][PUBLISH] failed | productId=${product.id} | sku=${payload.sku} | statusCode=${response.statusCode ?? 'unknown'} | reason=${failureMessage} | details=${this.stringifyForLog(response.details)} | payload=${this.stringifyForLog(this.buildPayloadLog(payload))}`
        );
        summary.failures.push({
          sku: payload.sku,
          error: failureMessage,
          statusCode: response.statusCode,
          details: response.details
        });
      }

      if (!hasNext) {
        break;
      }

      offset = nextOffset ?? offset + limit;
    } while (maxPages === null || pagesProcessed < maxPages);

    summary.pagesProcessed = pagesProcessed;
    summary.itemsFetched = itemsFetched;
    summary.hasNext = hasNext;
    summary.nextOffset = nextOffset;

    this.logger.log(
      `[GOOGLE-MERCHANT][PUBLISH] finished | pages=${summary.pagesProcessed} | fetched=${summary.itemsFetched} | publishedOk=${summary.published.success} | publishedFailed=${summary.published.failed} | syncOk=${summary.sync.success} | syncFailed=${summary.sync.failed} | hasNext=${summary.hasNext} | nextOffset=${summary.nextOffset ?? 'null'}`
    );

    return summary;
  }

  private async savePublishedProductInSyncItems(
    product: MadreGoogleMerchantActiveProduct,
    payload: CreateGoogleMerchantProductRequest,
    marketplaceResponse: any
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      await this.sendBulkProductSync.execute(this.buildSyncPayload(product, payload, marketplaceResponse));
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? 'SYNC_ITEMS_SAVE_ERROR'
      };
    }
  }

  private buildSyncPayload(
    product: MadreGoogleMerchantActiveProduct,
    payload: CreateGoogleMerchantProductRequest,
    marketplaceResponse: any
  ): BulkMarketplaceProductsDto {
    return {
      marketplace: 'google-merchant',
      items: [
        {
          externalId: this.resolveExternalId(marketplaceResponse, payload),
          sellerSku: payload.sku,
          marketplaceSku: payload.sku,
          price: payload.price,
          stock: payload.stock,
          status: 'ACTIVE',
          raw: {
            offerId: payload.sku,
            contentLanguage: this.resolveString(marketplaceResponse, ['contentLanguage']) ?? 'es',
            feedLabel: this.resolveString(marketplaceResponse, ['feedLabel']) ?? 'AR',
            productId: product.id,
            request: payload,
            response: marketplaceResponse ?? null,
            publishedAt: new Date().toISOString()
          }
        }
      ]
    };
  }

  private resolveExternalId(marketplaceResponse: any, payload: CreateGoogleMerchantProductRequest): string {
    return (
      this.resolveString(marketplaceResponse, ['base64EncodedName']) ??
      this.resolveString(marketplaceResponse, ['name']) ??
      this.resolveString(marketplaceResponse, ['product', 'base64EncodedName']) ??
      this.resolveString(marketplaceResponse, ['product', 'name']) ??
      payload.sku
    );
  }

  private resolveString(source: any, path: string[]): string | null {
    let current = source;

    for (const key of path) {
      if (!current || typeof current !== 'object') {
        return null;
      }

      current = current[key];
    }

    if (typeof current !== 'string') {
      return null;
    }

    const value = current.trim();
    return value || null;
  }

  private stringifyForLog(value: unknown): string {
    if (value === undefined) {
      return 'undefined';
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private buildPayloadLog(payload: CreateGoogleMerchantProductRequest): CreateGoogleMerchantProductRequest {
    return {
      ...payload,
      description: payload.description.length > 180 ? `${payload.description.slice(0, 180)}...` : payload.description,
      title: payload.title.length > 120 ? `${payload.title.slice(0, 120)}...` : payload.title
    };
  }

  private buildPayload(product: MadreGoogleMerchantActiveProduct): CreateGoogleMerchantProductRequest | null {
    const sku = String(product.asin ?? product.id ?? '').trim();
    const title = String(product.name_esp ?? product.name ?? '').trim();
    const description = this.buildDescription(product, title);
    const price = this.resolvePrice(product);
    const stock = Number(product.in_stock ?? 0) > 0 ? 1 : 0;
    const brand = String(product.brand_name ?? product.brand ?? product.brand_id ?? '').trim() || 'Sin marca';
    const imageUrl = this.buildImageUrl(product.images?.[0]);
    const productUrl = this.buildProductUrl(product);

    if (!sku || !title || !description || !price || !imageUrl || !productUrl) {
      return null;
    }

    return {
      sku,
      title,
      description,
      price,
      stock,
      brand,
      imageUrl,
      productUrl
    };
  }

  private buildDescription(product: MadreGoogleMerchantActiveProduct, fallbackTitle: string): string {
    const explicitDescription = String(product.description_esp ?? product.description ?? '').trim();

    if (explicitDescription) {
      return explicitDescription;
    }

    const features = this.parseFeatures(product.features_esp ?? product.features);

    if (features.length > 0) {
      return features.join('\n');
    }

    return fallbackTitle;
  }

  private parseFeatures(features?: string | string[] | null): string[] {
    if (!features) {
      return [];
    }

    if (Array.isArray(features)) {
      return features.map(feature => String(feature).trim()).filter(Boolean);
    }

    const rawFeatures = features.trim();

    if (!rawFeatures) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawFeatures);

      if (Array.isArray(parsed)) {
        return parsed.map(feature => String(feature).trim()).filter(Boolean);
      }
    } catch {
      return [rawFeatures];
    }

    return [rawFeatures];
  }

  private resolvePrice(product: MadreGoogleMerchantActiveProduct): number {
    const price = Number(product.sale_price ?? product.price ?? 0);

    if (!Number.isFinite(price) || price <= 0) {
      return 0;
    }

    return price;
  }

  private buildImageUrl(image?: string): string {
    if (!image) {
      return '';
    }

    if (/^https?:\/\//i.test(image)) {
      return image;
    }

    return `${this.IMAGE_BASE_URL.replace(/\/+$/, '')}/${image.replace(/^\/+/, '')}`;
  }

  private buildProductUrl(product: MadreGoogleMerchantActiveProduct): string {
    const suffix = String(product.id ?? '').trim();

    if (!suffix) {
      return '';
    }

    return `${this.PRODUCT_BASE_URL.replace(/\/+$/, '')}/${suffix.replace(/^\/+/, '')}`;
  }
}
