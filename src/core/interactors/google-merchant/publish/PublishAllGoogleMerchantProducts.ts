import { Inject, Injectable, Logger } from '@nestjs/common';
import { ICheckProductExistsRepository } from 'src/core/adapters/repositories/madre/Sync_items/CheckProductExists/ICheckProductExistsRepository';
import { IGetGoogleMerchantActiveProductsRepository } from 'src/core/adapters/repositories/madre/google-merchant/get/IGetGoogleMerchantActiveProductsRepository';
import { ISendBulkProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/ISendBulkProductSyncRepository';
import { ICreateGoogleMerchantProductRepository } from 'src/core/adapters/repositories/marketplace/google-merchant/products/create/ICreateGoogleMerchantProductRepository';
import { MadreGoogleMerchantActiveProduct } from 'src/core/entitis/madre-api/google-merchant/get/GoogleMerchantActiveProductsResponse';
import { BulkMarketplaceProductsDto } from 'src/core/entitis/madre-api/product-sync/dto/BulkMarketplaceProductsDto';
import {
  CreateGoogleMerchantProductRequest,
  CreateGoogleMerchantProductResponse
} from 'src/core/entitis/marketplace-api/google-merchant/products/create/CreateGoogleMerchantProductRequest';

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
  skipped: {
    alreadyExists: number;
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
  pageFetchFailures: Array<{
    page: number;
    offset: number;
    limit: number;
    error: string;
    statusCode?: number;
    details?: unknown;
  }>;
  skippedItems: Array<{
    sku: string;
    reason: string;
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

    @Inject('ICheckProductExistsRepository')
    private readonly checkProductExists: ICheckProductExistsRepository,

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
      skipped: {
        alreadyExists: 0
      },
      sync: {
        success: 0,
        failed: 0
      },
      hasNext: false,
      nextOffset: null,
      failures: [],
      syncFailures: [],
      pageFetchFailures: [],
      skippedItems: []
    };

    this.logger.log(
      `[GOOGLE-MERCHANT][PUBLISH] started | offset=${offset} | limit=${limit} | maxPages=${maxPages ?? 'all'}`
    );

    do {
      const pageNumber = pagesProcessed + 1;
      const pageResult = await this.fetchPageWithRetry(limit, offset, pageNumber);

      if (!pageResult.success) {
        hasNext = true;
        nextOffset = offset;
        summary.pageFetchFailures.push({
          page: pageNumber,
          offset,
          limit,
          error: pageResult.error,
          statusCode: pageResult.statusCode,
          details: pageResult.details
        });
        this.logger.error(
          `[GOOGLE-MERCHANT][PUBLISH] page fetch failed | page=${pageNumber} | offset=${offset} | limit=${limit} | statusCode=${pageResult.statusCode ?? 'unknown'} | reason=${pageResult.error} | details=${this.stringifyForLog(pageResult.details)}`
        );
        break;
      }

      const page = pageResult.page;

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

        const existsValidation = await this.validateProductDoesNotExist(product, payload);

        if (!existsValidation.success) {
          summary.published.failed += 1;
          this.logger.error(
            `[GOOGLE-MERCHANT][PUBLISH] exists check failed | productId=${product.id} | sku=${payload.sku} | reason=${existsValidation.error}`
          );
          summary.failures.push({
            sku: payload.sku,
            error: existsValidation.error
          });
          continue;
        }

        if (existsValidation.exists) {
          summary.skipped.alreadyExists += 1;
          this.logger.log(
            `[GOOGLE-MERCHANT][PUBLISH] skipped already exists | productId=${product.id} | sku=${payload.sku}`
          );
          summary.skippedItems.push({
            sku: payload.sku,
            reason: 'PRODUCT_ALREADY_EXISTS'
          });
          continue;
        }

        this.logger.log(
          `[GOOGLE-MERCHANT][PUBLISH] publishing | productId=${product.id} | sku=${payload.sku} | price=${payload.price} | stock=${payload.stock}`
        );

        const response = await this.publishWithRetry(product, payload);

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
      `[GOOGLE-MERCHANT][PUBLISH] finished | pages=${summary.pagesProcessed} | fetched=${summary.itemsFetched} | publishedOk=${summary.published.success} | publishedFailed=${summary.published.failed} | skippedAlreadyExists=${summary.skipped.alreadyExists} | syncOk=${summary.sync.success} | syncFailed=${summary.sync.failed} | pageFetchFailed=${summary.pageFetchFailures.length} | hasNext=${summary.hasNext} | nextOffset=${summary.nextOffset ?? 'null'}`
    );

    return summary;
  }

  private async fetchPageWithRetry(
    limit: number,
    offset: number,
    pageNumber: number
  ): Promise<
    | { success: true; page: Awaited<ReturnType<IGetGoogleMerchantActiveProductsRepository['listActive']>> }
    | { success: false; error: string; statusCode?: number; details?: unknown }
  > {
    const maxAttempts = this.resolvePositiveInteger(process.env.GOOGLE_MERCHANT_MADRE_FETCH_MAX_ATTEMPTS, 3);
    const baseDelayMs = this.resolveNonNegativeInteger(process.env.GOOGLE_MERCHANT_MADRE_FETCH_RETRY_DELAY_MS, 1000);
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const page = await this.getActiveProducts.listActive(limit, offset);

        if (attempt > 1) {
          this.logger.log(
            `[GOOGLE-MERCHANT][PUBLISH] page fetch retry succeeded | page=${pageNumber} | offset=${offset} | attempt=${attempt}/${maxAttempts}`
          );
        }

        return {
          success: true,
          page
        };
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error) || attempt === maxAttempts) {
          return {
            success: false,
            error: this.resolveErrorMessage(error, 'MADRE_ACTIVE_PRODUCTS_FETCH_ERROR'),
            statusCode: this.resolveErrorStatusCode(error),
            details: this.resolveErrorDetails(error)
          };
        }

        const delayMs = baseDelayMs * attempt;

        this.logger.warn(
          `[GOOGLE-MERCHANT][PUBLISH] retrying Madre page fetch | page=${pageNumber} | offset=${offset} | attempt=${attempt}/${maxAttempts} | nextAttempt=${attempt + 1} | delayMs=${delayMs} | statusCode=${this.resolveErrorStatusCode(error) ?? 'unknown'} | reason=${this.resolveErrorMessage(error, 'MADRE_ACTIVE_PRODUCTS_FETCH_ERROR')}`
        );

        await this.delay(delayMs);
      }
    }

    return {
      success: false,
      error: this.resolveErrorMessage(lastError, 'MADRE_ACTIVE_PRODUCTS_FETCH_ERROR'),
      statusCode: this.resolveErrorStatusCode(lastError),
      details: this.resolveErrorDetails(lastError)
    };
  }

  private async validateProductDoesNotExist(
    product: MadreGoogleMerchantActiveProduct,
    payload: CreateGoogleMerchantProductRequest
  ): Promise<{ success: true; exists: boolean } | { success: false; error: string }> {
    try {
      this.logger.log(`[GOOGLE-MERCHANT][PUBLISH] exists check | productId=${product.id} | sku=${payload.sku}`);

      const response = await this.checkProductExists.exists({
        marketplace: 'google-merchant',
        sellerSku: payload.sku
      });

      return {
        success: true,
        exists: response.exists === true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? 'PRODUCT_EXISTS_CHECK_ERROR'
      };
    }
  }

  private async publishWithRetry(
    product: MadreGoogleMerchantActiveProduct,
    payload: CreateGoogleMerchantProductRequest
  ): Promise<CreateGoogleMerchantProductResponse> {
    const maxAttempts = this.resolvePositiveInteger(process.env.GOOGLE_MERCHANT_PUBLISH_MAX_ATTEMPTS, 3);
    const baseDelayMs = this.resolveNonNegativeInteger(process.env.GOOGLE_MERCHANT_PUBLISH_RETRY_DELAY_MS, 1000);
    let lastResponse: CreateGoogleMerchantProductResponse | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await this.createGoogleMerchantProduct.create(payload);
      lastResponse = response;

      if (response.success) {
        if (attempt > 1) {
          this.logger.log(
            `[GOOGLE-MERCHANT][PUBLISH] retry succeeded | productId=${product.id} | sku=${payload.sku} | attempt=${attempt}/${maxAttempts}`
          );
        }

        return response;
      }

      if (!this.isRetryablePublishFailure(response) || attempt === maxAttempts) {
        return response;
      }

      const delayMs = baseDelayMs * attempt;

      this.logger.warn(
        `[GOOGLE-MERCHANT][PUBLISH] retrying transient failure | productId=${product.id} | sku=${payload.sku} | attempt=${attempt}/${maxAttempts} | nextAttempt=${attempt + 1} | delayMs=${delayMs} | statusCode=${response.statusCode ?? 'unknown'} | reason=${response.message ?? 'GOOGLE_MERCHANT_CREATE_ERROR'}`
      );

      await this.delay(delayMs);
    }

    return (
      lastResponse ?? {
        success: false,
        message: 'GOOGLE_MERCHANT_CREATE_ERROR'
      }
    );
  }

  private isRetryablePublishFailure(response: CreateGoogleMerchantProductResponse): boolean {
    if (response.statusCode && [408, 429, 500, 502, 503, 504].includes(response.statusCode)) {
      return true;
    }

    const errorText = `${response.message ?? ''} ${this.stringifyForLog(response.details)}`.toLowerCase();

    return (
      errorText.includes('timeout') ||
      errorText.includes('timed out') ||
      errorText.includes('econnreset') ||
      errorText.includes('etimedout') ||
      errorText.includes('socket hang up')
    );
  }

  private isRetryableError(error: unknown): boolean {
    const statusCode = this.resolveErrorStatusCode(error);

    if (statusCode && [408, 429, 500, 502, 503, 504].includes(statusCode)) {
      return true;
    }

    const errorText = `${this.resolveErrorMessage(error, '')} ${this.stringifyForLog(this.resolveErrorDetails(error))}`
      .toLowerCase();

    return (
      errorText.includes('timeout') ||
      errorText.includes('timed out') ||
      errorText.includes('econnaborted') ||
      errorText.includes('econnreset') ||
      errorText.includes('etimedout') ||
      errorText.includes('socket hang up')
    );
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    const message = (error as any)?.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return fallback;
  }

  private resolveErrorStatusCode(error: unknown): number | undefined {
    const statusCode = (error as any)?.statusCode;

    if (typeof statusCode === 'number') {
      return statusCode;
    }

    return undefined;
  }

  private resolveErrorDetails(error: unknown): unknown {
    return (error as any)?.response ?? (error as any)?.details;
  }

  private resolvePositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  private resolveNonNegativeInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  private delay(ms: number): Promise<void> {
    if (ms <= 0) {
      return Promise.resolve();
    }

    return new Promise(resolve => setTimeout(resolve, ms));
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
    const imageUrls = this.buildImageUrls(product.images);
    const imageUrl = imageUrls[0] ?? '';
    const productUrl = this.buildProductUrl(product);
    const googleProductCategory = this.buildGoogleProductCategory(product);
    const mpn = this.buildMpn(product, sku);

    if (!sku || !title || !description || !price || !imageUrl || !productUrl || !googleProductCategory) {
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
      productUrl,
      additionalImageUrls: imageUrls.slice(1),
      condition: 'new',
      googleProductCategory,
      mpn,
      identifierExists: this.buildIdentifierExists(sku, mpn),
      shipping: this.buildShipping()
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

  private buildImageUrls(images?: string[]): string[] {
    return (images ?? [])
      .map(image => this.buildImageUrl(image))
      .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
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

  private buildGoogleProductCategory(product: MadreGoogleMerchantActiveProduct): string {
    const categoryTree = product.categoryTree ?? [];
    const categoryFromTree = categoryTree
      .map(category => String(category?.name ?? '').trim())
      .filter(Boolean)
      .join(' > ');

    if (categoryFromTree) {
      return categoryFromTree;
    }

    return String(product.compuesto_amazon ?? '').trim();
  }

  private buildMpn(product: MadreGoogleMerchantActiveProduct, sku: string): string {
    return String(product.partNumber ?? product.model ?? sku).trim();
  }

  private buildIdentifierExists(sku: string, mpn: string): boolean {
    return Boolean(sku || mpn);
  }

  private buildShipping() {
    return [
      {
        country: 'AR',
        service: 'Envio a domicilio',
        price: 0,
        minHandlingTime: 1,
        maxHandlingTime: 3,
        minTransitTime: 2,
        maxTransitTime: 10
      }
    ];
  }

  private buildProductUrl(product: MadreGoogleMerchantActiveProduct): string {
    const suffix = String(product.id ?? '').trim();

    if (!suffix) {
      return '';
    }

    return `${this.PRODUCT_BASE_URL.replace(/\/+$/, '')}/${suffix.replace(/^\/+/, '')}`;
  }
}
