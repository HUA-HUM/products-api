import { Inject, Injectable } from '@nestjs/common';
import {
  IGetIdProductInMarketplacesRepository,
  MarketplaceProductIdAndSkuMarketplace
} from 'src/core/adapters/repositories/madre/Sync_items/GetIdProductInMarketplaces/IGetIdProductInMarketplacesRepository';
import {
  IGetMadreProductsStatusBulkRepository,
  MadreProductStatusBulkItem
} from 'src/core/adapters/repositories/madre/products/get/IGetMadreProductsStatusBulkRepository';
import { ExecuteManualPriceUpdate } from './ExecuteManualPriceUpdate';
import { ExecuteManualStatusUpdate } from './ExecuteManualStatusUpdate';
import { ExecuteManualStockUpdate } from './ExecuteManualStockUpdate';

export type RefreshMarketplacePublishedItemsInput = {
  marketplace: MarketplaceProductIdAndSkuMarketplace;
  limit?: number;
  offset?: number;
  maxPages?: number;
};

export type RefreshMarketplacePublishedItemsSummary = {
  marketplace: MarketplaceProductIdAndSkuMarketplace;
  pagesProcessed: number;
  itemsFetched: number;
  itemsMatchedFromMadre: number;
  updates: {
    price: { success: number; failed: number };
    stock: { success: number; failed: number };
    status: { success: number; failed: number };
  };
  hasNext: boolean;
  nextOffset: number | null;
};

@Injectable()
export class RefreshMarketplacePublishedItems {
  constructor(
    @Inject('IGetIdProductInMarketplacesRepository')
    private readonly getIdsAndSkus: IGetIdProductInMarketplacesRepository,

    @Inject('IGetMadreProductsStatusBulkRepository')
    private readonly getMadreBulkStatus: IGetMadreProductsStatusBulkRepository,

    private readonly executeManualPriceUpdate: ExecuteManualPriceUpdate,
    private readonly executeManualStockUpdate: ExecuteManualStockUpdate,
    private readonly executeManualStatusUpdate: ExecuteManualStatusUpdate
  ) {}

  async execute(input: RefreshMarketplacePublishedItemsInput): Promise<RefreshMarketplacePublishedItemsSummary> {
    const marketplace = input.marketplace;
    const limit = Math.max(1, input.limit ?? 100);
    const maxPages = input.maxPages ? Math.max(1, input.maxPages) : null;

    let offset = Math.max(0, input.offset ?? 0);
    let pagesProcessed = 0;
    let itemsFetched = 0;
    let itemsMatchedFromMadre = 0;
    let hasNext = false;
    let nextOffset: number | null = null;

    const summary: RefreshMarketplacePublishedItemsSummary = {
      marketplace,
      pagesProcessed: 0,
      itemsFetched: 0,
      itemsMatchedFromMadre: 0,
      updates: {
        price: { success: 0, failed: 0 },
        stock: { success: 0, failed: 0 },
        status: { success: 0, failed: 0 }
      },
      hasNext: false,
      nextOffset: null
    };

    do {
      const page = await this.getIdsAndSkus.list({
        marketplace,
        limit,
        offset
      });

      pagesProcessed += 1;
      itemsFetched += page.items.length;
      hasNext = page.hasNext;
      nextOffset = page.nextOffset;

      if (page.items.length === 0) {
        break;
      }

      const skus = page.items.map(item => item.sellerSku).filter(Boolean);
      const madreBulk = await this.getMadreBulkStatus.getBySkus(skus);
      const madreItemsBySku = new Map<string, MadreProductStatusBulkItem>(
        madreBulk.items.map(item => [item.sku, item])
      );

      itemsMatchedFromMadre += madreBulk.items.length;

      for (const sku of skus) {
        const madreItem = madreItemsBySku.get(sku);

        if (!madreItem) {
          const [stockResult, statusResult] = await Promise.all([
            this.executeManualStockUpdate.execute({
              sku,
              marketplace,
              valorNuevo: '0'
            }),
            this.executeManualStatusUpdate.execute({
              sku,
              marketplace,
              valorNuevo: 'inactive'
            })
          ]);

          summary.updates.stock[stockResult.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
          summary.updates.status[statusResult.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
          continue;
        }

        const [priceResult, stockResult, statusResult] = await Promise.all([
          this.executeManualPriceUpdate.execute({
            sku,
            marketplace,
            valorNuevo: String(madreItem.price)
          }),
          this.executeManualStockUpdate.execute({
            sku,
            marketplace,
            valorNuevo: String(madreItem.stock)
          }),
          this.executeManualStatusUpdate.execute({
            sku,
            marketplace,
            valorNuevo: String(madreItem.status)
          })
        ]);

        summary.updates.price[priceResult.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
        summary.updates.stock[stockResult.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
        summary.updates.status[statusResult.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
      }

      if (!hasNext) {
        break;
      }

      offset = nextOffset ?? offset + limit;
    } while (maxPages === null || pagesProcessed < maxPages);

    summary.pagesProcessed = pagesProcessed;
    summary.itemsFetched = itemsFetched;
    summary.itemsMatchedFromMadre = itemsMatchedFromMadre;
    summary.hasNext = hasNext;
    summary.nextOffset = nextOffset;

    return summary;
  }
}
