import { Inject, Injectable } from '@nestjs/common';
import {
  IGetIdProductInMarketplacesRepository,
  MarketplaceProductIdAndSkuMarketplace
} from 'src/core/adapters/repositories/madre/Sync_items/GetIdProductInMarketplaces/IGetIdProductInMarketplacesRepository';
import { IGetPausedMarketplaceSkusRepository } from 'src/core/adapters/repositories/madre/paused-skus/IGetPausedMarketplaceSkusRepository';
import {
  IGetMadreProductsStatusBulkRepository,
  MadreProductStatusBulkItem
} from 'src/core/adapters/repositories/madre/products/get/IGetMadreProductsStatusBulkRepository';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { ISendBulkProductSyncRepository } from 'src/core/adapters/repositories/madre/product-sync/ISendBulkProductSyncRepository';
import { BulkMarketplaceProductsDto } from 'src/core/entitis/madre-api/product-sync/dto/BulkMarketplaceProductsDto';
import { ProductSyncStatus } from 'src/core/entitis/madre-api/product-sync/ProductSyncStatus';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { isNotPublishedMarketplaceMessage } from 'src/core/interactors/marketplace-changes/marketplace-actions/shared/MarketplacePublicationState';
import { ExecuteManualPriceUpdate } from './ExecuteManualPriceUpdate';
import { ExecuteManualStatusUpdate } from './ExecuteManualStatusUpdate';
import { ExecuteManualStockUpdate } from './ExecuteManualStockUpdate';

type RefreshSupportedMarketplace = Exclude<MarketplaceProductIdAndSkuMarketplace, 'google-merchant'>;
type ProductSyncSnapshot = NonNullable<Awaited<ReturnType<IGetProductSyncItemsRepository['getBySellerSkuAndMarketplace']>>>;

type MadreSyncResult = {
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error?: string;
};

type MarketplaceUpdateResults = {
  price: MarketplaceActionResult | null;
  stock: MarketplaceActionResult | null;
  status: MarketplaceActionResult;
};

export type RefreshMarketplacePublishedItemsInput = {
  marketplace: RefreshSupportedMarketplace;
  limit?: number;
  offset?: number;
  maxPages?: number;
};

export type RefreshMarketplacePublishedItemInput = {
  marketplace: RefreshSupportedMarketplace;
  sku: string;
};

export type RefreshMarketplacePublishedItemsSummary = {
  marketplace: RefreshSupportedMarketplace;
  pagesProcessed: number;
  itemsFetched: number;
  itemsMatchedFromMadre: number;
  updates: {
    price: { success: number; failed: number };
    stock: { success: number; failed: number };
    status: { success: number; failed: number };
  };
  sync: {
    success: number;
    failed: number;
    skipped: number;
  };
  hasNext: boolean;
  nextOffset: number | null;
};

export type RefreshMarketplacePublishedItemSummary = {
  marketplace: RefreshSupportedMarketplace;
  sku: string;
  foundInMadre: boolean;
  skipped: boolean;
  skipReason?: string;
  madre?: {
    price: number;
    stock: number;
    status: string;
  };
  updates: {
    price: MarketplaceActionResult | null;
    stock: MarketplaceActionResult | null;
    status: MarketplaceActionResult;
  };
  sync: MadreSyncResult;
};

@Injectable()
export class RefreshMarketplacePublishedItems {
  constructor(
    @Inject('IGetIdProductInMarketplacesRepository')
    private readonly getIdsAndSkus: IGetIdProductInMarketplacesRepository,

    @Inject('IGetMadreProductsStatusBulkRepository')
    private readonly getMadreBulkStatus: IGetMadreProductsStatusBulkRepository,

    @Inject('IGetProductSyncItemsRepository')
    private readonly syncItems: IGetProductSyncItemsRepository,

    @Inject('ISendBulkProductSyncRepository')
    private readonly sendBulkProductSync: ISendBulkProductSyncRepository,

    @Inject('IGetPausedMarketplaceSkusRepository')
    private readonly pausedSkus: IGetPausedMarketplaceSkusRepository,

    private readonly executeManualPriceUpdate: ExecuteManualPriceUpdate,
    private readonly executeManualStockUpdate: ExecuteManualStockUpdate,
    private readonly executeManualStatusUpdate: ExecuteManualStatusUpdate
  ) {}

  async executeOne(input: RefreshMarketplacePublishedItemInput): Promise<RefreshMarketplacePublishedItemSummary> {
    const sku = input.sku.trim();

    if (!sku) {
      throw new Error('sku is required');
    }

    const madreBulk = await this.getMadreBulkStatus.getBySkus([sku]);
    const madreItem = madreBulk.items.find(item => item.sku === sku);
    const pausedBySku = await this.getPausedBySku([sku]);

    if (pausedBySku.get(sku) === true) {
      return this.pauseMarketplaceItem({
        marketplace: input.marketplace,
        sku,
        madreItem
      });
    }

    if (!madreItem) {
      const [stockResult, statusResult] = await Promise.all([
        this.executeManualStockUpdate.execute({
          sku,
          marketplace: input.marketplace,
          valorNuevo: '0'
        }),
        this.executeManualStatusUpdate.execute({
          sku,
          marketplace: input.marketplace,
          valorNuevo: 'inactive'
        })
      ]);
      const updates = {
        price: null,
        stock: stockResult,
        status: statusResult
      };
      const sync = await this.syncMarketplaceItem({
        marketplace: input.marketplace,
        sku,
        desired: {
          stock: 0,
          status: 'PAUSED'
        },
        updates
      });

      return {
        marketplace: input.marketplace,
        sku,
        foundInMadre: false,
        skipped: sync.status === 'SKIPPED',
        skipReason: sync.status === 'SKIPPED' ? sync.error : undefined,
        updates,
        sync
      };
    }

    const [priceResult, stockResult, statusResult] = await Promise.all([
      this.executeManualPriceUpdate.execute({
        sku,
        marketplace: input.marketplace,
        valorNuevo: String(madreItem.price)
      }),
      this.executeManualStockUpdate.execute({
        sku,
        marketplace: input.marketplace,
        valorNuevo: String(madreItem.stock)
      }),
      this.executeManualStatusUpdate.execute({
        sku,
        marketplace: input.marketplace,
        valorNuevo: String(madreItem.status)
      })
    ]);
    const updates = {
      price: priceResult,
      stock: stockResult,
      status: statusResult
    };
    const sync = await this.syncMarketplaceItem({
      marketplace: input.marketplace,
      sku,
      desired: {
        price: madreItem.price,
        stock: madreItem.stock,
        status: madreItem.status
      },
      updates
    });

    return {
      marketplace: input.marketplace,
      sku,
      foundInMadre: true,
      skipped: sync.status === 'SKIPPED',
      skipReason: sync.status === 'SKIPPED' ? sync.error : undefined,
      madre: {
        price: madreItem.price,
        stock: madreItem.stock,
        status: madreItem.status
      },
      updates,
      sync
    };
  }

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
      sync: {
        success: 0,
        failed: 0,
        skipped: 0
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
      const publishedItemsBySku = new Map(page.items.map(item => [item.sellerSku, item]));
      const pausedBySku = await this.getPausedBySku(skus);

      itemsMatchedFromMadre += madreBulk.items.length;

      for (const sku of skus) {
        if (pausedBySku.get(sku) === true) {
          const pauseResult = await this.pauseMarketplaceItem({
            marketplace,
            sku,
            externalIdHint: publishedItemsBySku.get(sku)?.id,
            madreItem: madreItemsBySku.get(sku)
          });

          summary.updates.status[pauseResult.updates.status.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
          this.accumulateSyncResult(summary, pauseResult.sync);
          continue;
        }

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
          const updates = {
            price: null,
            stock: stockResult,
            status: statusResult
          };
          const syncResult = await this.syncMarketplaceItem({
            marketplace,
            sku,
            externalIdHint: publishedItemsBySku.get(sku)?.id,
            desired: {
              stock: 0,
              status: 'PAUSED'
            },
            updates
          });

          summary.updates.stock[stockResult.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
          summary.updates.status[statusResult.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
          this.accumulateSyncResult(summary, syncResult);
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
        const updates = {
          price: priceResult,
          stock: stockResult,
          status: statusResult
        };
        const syncResult = await this.syncMarketplaceItem({
          marketplace,
          sku,
          externalIdHint: publishedItemsBySku.get(sku)?.id,
          desired: {
            price: madreItem.price,
            stock: madreItem.stock,
            status: madreItem.status
          },
          updates
        });

        summary.updates.price[priceResult.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
        summary.updates.stock[stockResult.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
        summary.updates.status[statusResult.status === 'SUCCESS' ? 'success' : 'failed'] += 1;
        this.accumulateSyncResult(summary, syncResult);
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

  private async syncMarketplaceItem(params: {
    marketplace: RefreshSupportedMarketplace;
    sku: string;
    externalIdHint?: string;
    desired: {
      price?: number;
      stock?: number;
      status: string;
    };
    updates: MarketplaceUpdateResults;
  }): Promise<MadreSyncResult> {
    if (!this.hasSuccessfulMarketplaceUpdate(params.updates)) {
      if (this.hasOnlyNotPublishedMarketplaceFailures(params.updates)) {
        return {
          status: 'SKIPPED',
          error: `SKU=${params.sku} is not published in marketplace=${params.marketplace}`
        };
      }

      return {
        status: 'FAILED',
        error: 'No marketplace update succeeded'
      };
    }

    try {
      const snapshot = await this.syncItems.getBySellerSkuAndMarketplace(params.sku, params.marketplace);
      const payload = this.buildSyncPayload({
        ...params,
        snapshot
      });

      await this.sendBulkProductSync.execute(payload);

      return {
        status: 'SUCCESS'
      };
    } catch (error) {
      return {
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private buildSyncPayload(params: {
    marketplace: RefreshSupportedMarketplace;
    sku: string;
    externalIdHint?: string;
    desired: {
      price?: number;
      stock?: number;
      status: string;
    };
    updates: MarketplaceUpdateResults;
    snapshot: ProductSyncSnapshot | null;
  }): BulkMarketplaceProductsDto {
    const priceWasUpdated = params.updates.price?.status === 'SUCCESS' && params.desired.price !== undefined;
    const stockWasUpdated = params.updates.stock?.status === 'SUCCESS' && params.desired.stock !== undefined;
    const statusWasUpdated = params.updates.status.status === 'SUCCESS';

    const price = priceWasUpdated ? Number(params.desired.price) : Number(params.snapshot?.price ?? 0);
    const stock = stockWasUpdated ? Number(params.desired.stock) : Number(params.snapshot?.stock ?? 0);
    const status = statusWasUpdated
      ? this.normalizeSyncStatus(params.desired.status)
      : this.normalizeSyncStatus(params.snapshot?.status);

    return {
      marketplace: params.marketplace,
      items: [
        {
          externalId: String(params.snapshot?.externalId ?? params.externalIdHint ?? params.sku),
          sellerSku: params.sku,
          marketplaceSku: params.snapshot?.marketplaceSku ?? params.sku,
          price,
          stock,
          status,
          raw: {
            source: 'refresh-published',
            sku: params.sku,
            marketplace: params.marketplace,
            syncedAt: new Date().toISOString(),
            desired: params.desired,
            updates: params.updates,
            previousSnapshot: params.snapshot
          }
        }
      ]
    };
  }

  private hasSuccessfulMarketplaceUpdate(updates: MarketplaceUpdateResults): boolean {
    return [updates.price, updates.stock, updates.status].some(update => update?.status === 'SUCCESS');
  }

  private hasOnlyNotPublishedMarketplaceFailures(updates: MarketplaceUpdateResults): boolean {
    const attemptedUpdates = [updates.price, updates.stock, updates.status].filter(
      (update): update is MarketplaceActionResult => update !== null
    );

    return (
      attemptedUpdates.length > 0 &&
      attemptedUpdates.every(
        update => update.status === 'FAILED' && isNotPublishedMarketplaceMessage(update.error)
      )
    );
  }

  private accumulateSyncResult(summary: RefreshMarketplacePublishedItemsSummary, result: MadreSyncResult): void {
    if (result.status === 'SUCCESS') {
      summary.sync.success += 1;
      return;
    }

    if (result.status === 'FAILED') {
      summary.sync.failed += 1;
      return;
    }

    summary.sync.skipped += 1;
  }

  private normalizeSyncStatus(status?: string): ProductSyncStatus {
    const normalized = String(status ?? '')
      .trim()
      .toUpperCase();

    if (!normalized) {
      return 'PENDING';
    }

    if (['ACTIVE', 'ACTIVO'].includes(normalized)) {
      return 'ACTIVE';
    }

    if (['INACTIVE', 'INACTIVO', 'PAUSED', 'PAUSADO'].includes(normalized)) {
      return 'PAUSED';
    }

    return normalized;
  }

  private async getPausedBySku(skus: string[]): Promise<Map<string, boolean>> {
    const uniqueSkus = Array.from(new Set(skus.map(sku => sku.trim()).filter(Boolean)));

    if (uniqueSkus.length === 0) {
      return new Map();
    }

    const response = await this.pausedSkus.getPausedSkus(uniqueSkus);

    return new Map(response.items.map(item => [item.sku, item.paused]));
  }

  private async pauseMarketplaceItem(params: {
    marketplace: RefreshSupportedMarketplace;
    sku: string;
    externalIdHint?: string;
    madreItem?: MadreProductStatusBulkItem;
  }): Promise<RefreshMarketplacePublishedItemSummary> {
    const statusResult = await this.executeManualStatusUpdate.execute({
      sku: params.sku,
      marketplace: params.marketplace,
      valorNuevo: 'inactive'
    });
    const updates = {
      price: null,
      stock: null,
      status: statusResult
    };
    const sync = await this.syncMarketplaceItem({
      marketplace: params.marketplace,
      sku: params.sku,
      externalIdHint: params.externalIdHint,
      desired: {
        status: 'PAUSED'
      },
      updates
    });

    return {
      marketplace: params.marketplace,
      sku: params.sku,
      foundInMadre: params.madreItem !== undefined,
      skipped: false,
      skipReason: 'SKU paused in Madre, forced inactive in marketplace',
      madre: params.madreItem
        ? {
            price: params.madreItem.price,
            stock: params.madreItem.stock,
            status: params.madreItem.status
          }
        : undefined,
      updates,
      sync
    };
  }
}
