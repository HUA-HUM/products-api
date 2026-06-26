import { Inject, Injectable, Logger } from '@nestjs/common';
import { ICheckProductExistsRepository } from 'src/core/adapters/repositories/madre/Sync_items/CheckProductExists/ICheckProductExistsRepository';
import { ISendBulkProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/ISendBulkProductSyncRepository';
import { ICreateGoogleMerchantProductRepository } from 'src/core/adapters/repositories/marketplace/google-merchant/products/create/ICreateGoogleMerchantProductRepository';
import { MadreGoogleMerchantActiveProduct } from 'src/core/entitis/madre-api/google-merchant/get/GoogleMerchantActiveProductsResponse';
import { BulkMarketplaceProductsDto } from 'src/core/entitis/madre-api/product-sync/dto/BulkMarketplaceProductsDto';
import {
  CreateGoogleMerchantProductRequest,
  CreateGoogleMerchantProductResponse
} from 'src/core/entitis/marketplace-api/google-merchant/products/create/CreateGoogleMerchantProductRequest';

export type GoogleMerchantProductPublisherProgress = {
  stage: 'payload' | 'exists-check' | 'skipped' | 'publishing' | 'published' | 'syncing' | 'synced' | 'failed';
  productId?: string;
  sku?: string;
  attempt?: number;
  maxAttempts?: number;
};

export type GoogleMerchantProductPublisherCallbacks = {
  log?: (message: string) => void | Promise<void>;
  progress?: (progress: GoogleMerchantProductPublisherProgress) => void | Promise<void>;
};

export type GoogleMerchantProductPublisherResult =
  | {
      success: true;
      status: 'PUBLISHED';
      productId: string;
      sku: string;
      price: number;
      stock: number;
      wasAlreadySynced: boolean | null;
      marketplaceResponse: unknown;
    }
  | {
      success: true;
      status: 'SKIPPED_ALREADY_EXISTS';
      productId: string;
      sku: string;
    }
  | {
      success: false;
      status: 'PAYLOAD_ERROR' | 'EXISTS_CHECK_ERROR' | 'PUBLISH_ERROR' | 'SYNC_ERROR';
      productId: string;
      sku: string;
      error: string;
      retryable: boolean;
      statusCode?: number;
      details?: unknown;
      payload?: CreateGoogleMerchantProductRequest;
    };

@Injectable()
export class GoogleMerchantProductPublisher {
  private readonly logger = new Logger(GoogleMerchantProductPublisher.name);
  private readonly PRODUCT_BASE_URL =
    process.env.GOOGLE_MERCHANT_PRODUCT_BASE_URL ?? 'https://loquieroaca.com/products';
  private readonly IMAGE_BASE_URL =
    process.env.GOOGLE_MERCHANT_IMAGE_BASE_URL ?? 'https://images-na.ssl-images-amazon.com/images/I';

  constructor(
    @Inject('ICheckProductExistsRepository')
    private readonly checkProductExists: ICheckProductExistsRepository,

    @Inject('ICreateGoogleMerchantProductRepository')
    private readonly createGoogleMerchantProduct: ICreateGoogleMerchantProductRepository,

    @Inject('ISendBulkProductSyncRepository')
    private readonly sendBulkProductSync: ISendBulkProductSyncRepository
  ) {}

  async execute(
    product: MadreGoogleMerchantActiveProduct,
    callbacks: GoogleMerchantProductPublisherCallbacks = {}
  ): Promise<GoogleMerchantProductPublisherResult> {
    const fallbackSku = String(product.asin ?? product.id ?? 'unknown');
    const productId = String(product.id ?? '');

    await this.emitProgress(callbacks, {
      stage: 'payload',
      productId,
      sku: fallbackSku
    });

    const payload = this.buildPayload(product);

    if (!payload) {
      this.logger.warn(
        `[GOOGLE-MERCHANT][PUBLISH] payload skipped | productId=${product.id ?? '-'} | sku=${product.asin ?? '-'} | reason=unable_to_build_payload`
      );
      await this.emitLog(callbacks, 'Payload skipped: unable_to_build_payload');

      return {
        success: false,
        status: 'PAYLOAD_ERROR',
        productId,
        sku: fallbackSku,
        error: 'unable to build payload',
        retryable: false
      };
    }

    const existsValidation = await this.checkExistingProduct(product, payload, callbacks);
    const wasAlreadySynced = existsValidation.success ? existsValidation.exists : null;

    if (!existsValidation.success) {
      this.logger.error(
        `[GOOGLE-MERCHANT][PUBLISH] exists check failed | productId=${product.id} | sku=${payload.sku} | reason=${existsValidation.error}`
      );
      await this.emitLog(callbacks, `Exists check failed: ${existsValidation.error}`);

      return {
        success: false,
        status: 'EXISTS_CHECK_ERROR',
        productId,
        sku: payload.sku,
        error: existsValidation.error,
        retryable: true,
        payload
      };
    } else if (existsValidation.exists) {
      this.logger.log(`[GOOGLE-MERCHANT][PUBLISH] skipped already published | productId=${product.id} | sku=${payload.sku}`);
      await this.emitProgress(callbacks, {
        stage: 'skipped',
        productId,
        sku: payload.sku
      });
      await this.emitLog(callbacks, 'Skipped: PRODUCT_ALREADY_EXISTS');

      return {
        success: true,
        status: 'SKIPPED_ALREADY_EXISTS',
        productId,
        sku: payload.sku
      };
    }

    this.logger.log(
      `[GOOGLE-MERCHANT][PUBLISH] publishing | productId=${product.id} | sku=${payload.sku} | price=${payload.price} | stock=${payload.stock}`
    );
    await this.emitProgress(callbacks, {
      stage: 'publishing',
      productId,
      sku: payload.sku
    });

    const response = await this.publishWithRetry(product, payload, callbacks);

    if (!response.success) {
      const failureMessage = response.message ?? 'GOOGLE_MERCHANT_CREATE_ERROR';
      this.logger.error(
        `[GOOGLE-MERCHANT][PUBLISH] failed | productId=${product.id} | sku=${payload.sku} | statusCode=${response.statusCode ?? 'unknown'} | reason=${failureMessage} | details=${this.stringifyForLog(response.details)} | payload=${this.stringifyForLog(this.buildPayloadLog(payload))}`
      );

      return {
        success: false,
        status: 'PUBLISH_ERROR',
        productId,
        sku: payload.sku,
        error: failureMessage,
        retryable: this.isRetryablePublishFailure(response),
        statusCode: response.statusCode,
        details: response.details,
        payload
      };
    }

    this.logger.log(`[GOOGLE-MERCHANT][PUBLISH] published | productId=${product.id} | sku=${payload.sku}`);
    await this.emitProgress(callbacks, {
      stage: 'published',
      productId,
      sku: payload.sku
    });

    const syncResult = await this.savePublishedProductInSyncItems(product, payload, response.data, callbacks);

    if (!syncResult.success) {
      this.logger.error(`[GOOGLE-MERCHANT][SYNC] failed | productId=${product.id} | sku=${payload.sku} | reason=${syncResult.error}`);

      return {
        success: false,
        status: 'SYNC_ERROR',
        productId,
        sku: payload.sku,
        error: syncResult.error,
        retryable: true,
        payload
      };
    }

    this.logger.log(`[GOOGLE-MERCHANT][SYNC] saved | productId=${product.id} | sku=${payload.sku}`);
    await this.emitProgress(callbacks, {
      stage: 'synced',
      productId,
      sku: payload.sku
    });

    return {
      success: true,
      status: 'PUBLISHED',
      productId,
      sku: payload.sku,
      price: payload.price,
      stock: payload.stock,
      wasAlreadySynced,
      marketplaceResponse: response.data
    };
  }

  private async checkExistingProduct(
    product: MadreGoogleMerchantActiveProduct,
    payload: CreateGoogleMerchantProductRequest,
    callbacks: GoogleMerchantProductPublisherCallbacks
  ): Promise<{ success: true; exists: boolean } | { success: false; error: string }> {
    try {
      this.logger.log(`[GOOGLE-MERCHANT][PUBLISH] exists check | productId=${product.id} | sku=${payload.sku}`);
      await this.emitProgress(callbacks, {
        stage: 'exists-check',
        productId: product.id,
        sku: payload.sku
      });

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
    payload: CreateGoogleMerchantProductRequest,
    callbacks: GoogleMerchantProductPublisherCallbacks
  ): Promise<CreateGoogleMerchantProductResponse> {
    const maxAttempts = this.resolvePositiveInteger(process.env.GOOGLE_MERCHANT_PUBLISH_MAX_ATTEMPTS, 3);
    const baseDelayMs = this.resolveNonNegativeInteger(process.env.GOOGLE_MERCHANT_PUBLISH_RETRY_DELAY_MS, 1000);
    let lastResponse: CreateGoogleMerchantProductResponse | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.emitProgress(callbacks, {
        stage: 'publishing',
        productId: product.id,
        sku: payload.sku,
        attempt,
        maxAttempts
      });

      const response = await this.createGoogleMerchantProduct.create(payload);
      lastResponse = response;

      if (response.success) {
        if (attempt > 1) {
          this.logger.log(
            `[GOOGLE-MERCHANT][PUBLISH] retry succeeded | productId=${product.id} | sku=${payload.sku} | attempt=${attempt}/${maxAttempts}`
          );
          await this.emitLog(callbacks, `Retry succeeded on attempt ${attempt}/${maxAttempts}`);
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
      await this.emitLog(callbacks, `Retrying transient failure: attempt ${attempt}/${maxAttempts}, delayMs=${delayMs}`);

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
    marketplaceResponse: any,
    callbacks: GoogleMerchantProductPublisherCallbacks
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      await this.emitProgress(callbacks, {
        stage: 'syncing',
        productId: product.id,
        sku: payload.sku
      });
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

  private async emitLog(callbacks: GoogleMerchantProductPublisherCallbacks, message: string): Promise<void> {
    await callbacks.log?.(message);
  }

  private async emitProgress(
    callbacks: GoogleMerchantProductPublisherCallbacks,
    progress: GoogleMerchantProductPublisherProgress
  ): Promise<void> {
    await callbacks.progress?.(progress);
  }
}
