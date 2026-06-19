import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IGetIdProductInMarketplacesRepository,
  MarketplaceProductIdAndSkuItem
} from 'src/core/adapters/repositories/madre/Sync_items/GetIdProductInMarketplaces/IGetIdProductInMarketplacesRepository';
import { IDeleteGoogleMerchantProductRepository } from 'src/core/adapters/repositories/marketplace/google-merchant/products/delete/IDeleteGoogleMerchantProductRepository';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';

export type DeleteAllGoogleMerchantProductsInput = {
  limit?: number;
  offset?: number;
  maxPages?: number;
};

export type DeleteAllGoogleMerchantProductsSummary = {
  marketplace: 'google-merchant';
  pagesProcessed: number;
  itemsFetched: number;
  deleted: {
    success: number;
    failed: number;
  };
  hasNext: boolean;
  nextOffset: number | null;
  failures: Array<{
    sku: string;
    error: string;
  }>;
};

@Injectable()
export class DeleteAllGoogleMerchantProducts {
  private readonly logger = new Logger(DeleteAllGoogleMerchantProducts.name);
  private readonly DELETE_BATCH_SIZE = 10;

  constructor(
    @Inject('IGetIdProductInMarketplacesRepository')
    private readonly getIdsAndSkus: IGetIdProductInMarketplacesRepository,

    @Inject('IGetProductSyncItemsRepository')
    private readonly getProductSyncItems: IGetProductSyncItemsRepository,

    @Inject('IDeleteGoogleMerchantProductRepository')
    private readonly deleteGoogleMerchantProduct: IDeleteGoogleMerchantProductRepository
  ) {}

  async execute(input: DeleteAllGoogleMerchantProductsInput = {}): Promise<DeleteAllGoogleMerchantProductsSummary> {
    const limit = Math.max(1, input.limit ?? 100);
    const maxPages = input.maxPages ? Math.max(1, input.maxPages) : null;

    let offset = Math.max(0, input.offset ?? 0);
    let pagesProcessed = 0;
    let itemsFetched = 0;
    let hasNext = false;
    let nextOffset: number | null = null;

    const summary: DeleteAllGoogleMerchantProductsSummary = {
      marketplace: 'google-merchant',
      pagesProcessed: 0,
      itemsFetched: 0,
      deleted: {
        success: 0,
        failed: 0
      },
      hasNext: false,
      nextOffset: null,
      failures: []
    };

    do {
      const page = await this.getIdsAndSkus.list({
        marketplace: 'google-merchant',
        limit,
        offset
      });

      pagesProcessed += 1;
      itemsFetched += page.items.length;
      hasNext = page.hasNext;
      nextOffset = page.nextOffset;

      this.logger.log(
        `[GOOGLE-MERCHANT][DELETE] page fetched | page=${pagesProcessed} | offset=${offset} | count=${page.items.length} | hasNext=${hasNext}`
      );

      if (page.items.length === 0) {
        break;
      }

      const batches = this.chunkItems(page.items, this.DELETE_BATCH_SIZE);

      for (const batch of batches) {
        const results = await Promise.all(
          batch.map(async item => {
            try {
              const syncItem = await this.getProductSyncItems.getBySellerSku(item.sellerSku);
              const rawPayload = syncItem.raw_payload ?? {};
              const offerId = String(rawPayload.offerId ?? item.sellerSku);
              const contentLanguage = String(rawPayload.contentLanguage ?? 'es');
              const feedLabel = String(rawPayload.feedLabel ?? 'AR');

              const response = await this.deleteGoogleMerchantProduct.execute({
                offerId,
                contentLanguage,
                feedLabel
              });

              if (response.deleted === true) {
                return { sku: item.sellerSku, success: true as const };
              }

              return {
                sku: item.sellerSku,
                success: false as const,
                error: 'delete response returned deleted=false'
              };
            } catch (error: any) {
              return {
                sku: item.sellerSku,
                success: false as const,
                error: error?.message ?? 'unknown delete error'
              };
            }
          })
        );

        for (const result of results) {
          if (result.success) {
            summary.deleted.success += 1;
            continue;
          }

          summary.deleted.failed += 1;
          summary.failures.push({
            sku: result.sku,
            error: result.error
          });
        }
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

    return summary;
  }

  private chunkItems(items: MarketplaceProductIdAndSkuItem[], size: number): MarketplaceProductIdAndSkuItem[][] {
    const chunks: MarketplaceProductIdAndSkuItem[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }
}
