import { Inject, Injectable } from '@nestjs/common';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IUpdateProductSyncItemRepository } from 'src/core/adapters/repositories/madre/product-sync/IUpdateProductSyncItemRepository';
import { IUpdateMegatoneProductStatusRepository } from 'src/core/adapters/repositories/marketplace/megatone/products/update-status/IUpdateMegatoneProductStatusRepository';

type SyncItemStatus = 'ACTIVE' | 'PAUSED' | 'PENDING' | 'EN_REVISION' | 'DELETED' | 'ERROR';

type SyncItemDto = {
  seller_sku: string;
  external_id: string;
  status: SyncItemStatus;
};

@Injectable()
export class SyncStatus {
  private readonly LIMIT = 100;
  private readonly MEGATONE_USER_ID = 389;

  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly getSyncItems: IGetProductSyncItemsRepository,

    @Inject('IUpdateProductSyncItemRepository')
    private readonly updateSyncItem: IUpdateProductSyncItemRepository,

    @Inject('IUpdateMegatoneProductStatusRepository')
    private readonly updateMegatoneStatus: IUpdateMegatoneProductStatusRepository
  ) {}

  async execute(): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    let offset = 0;
    let processed = 0;
    let updated = 0;
    let errors = 0;

    console.log('[STATUS] Inicio sync de estados Madre → Megatone');

    while (true) {
      const page = await this.getSyncItems.listAll('megatone', this.LIMIT, offset);

      if (!page.items.length) {
        console.log('[STATUS] No hay más items para procesar');
        break;
      }

      for (const item of page.items as SyncItemDto[]) {
        processed++;

        try {
          const changed = await this.processItem(item);

          if (changed) {
            updated++;
            console.log(`[STATUS] ✔ Estado actualizado | SKU=${item.seller_sku}`);
          }
        } catch (error) {
          errors++;
          console.log(
            `[STATUS] ✖ Error | SKU=${item.seller_sku} | ${error instanceof Error ? error.message : 'unknown'}`
          );
        }
      }

      if (!page.hasNext) break;
      offset = page.nextOffset!;
    }

    console.log('[STATUS] Fin sync estados', { processed, updated, errors });

    return { processed, updated, errors };
  }

  private async processItem(item: SyncItemDto): Promise<boolean> {
    const { seller_sku, external_id, status } = item;

    /* ---------- SKIPS DEFINIDOS ---------- */
    if (status === 'DELETED' || status === 'PENDING' || status === 'EN_REVISION' || status === 'ERROR') {
      console.log(`[STATUS] ⏭ Skip ${status} | SKU=${seller_sku}`);
      return false;
    }

    /* ---------- MAPEO STATUS → MEGATONE ---------- */
    const megatoneStatus = status === 'ACTIVE' ? 1 : status === 'PAUSED' ? 2 : null;

    if (!megatoneStatus) {
      return false;
    }

    /* ---------- UPDATE MEGATONE ---------- */
    const result = await this.updateMegatoneStatus.bulkUpdateStatus(
      [
        {
          publicationId: Number(external_id),
          status: megatoneStatus
        }
      ],
      this.MEGATONE_USER_ID
    );

    /* ---------- VALIDACIÓN RESULTADO ---------- */
    if (result.status === 'FAILED' || result.success === 0) {
      console.log(`[STATUS] ⚠ Megatone rechazó update | SKU=${seller_sku} | result=${result.status}`);
      return false;
    }

    /* ---------- UPDATE sync_items (SOLO SI MEGATONE OK) ---------- */
    await this.updateSyncItem.updateBySellerSku(seller_sku, {
      status,
      raw: {
        source: 'status-sync',
        megatoneResult: result.status,
        syncedAt: new Date().toISOString()
      }
    });

    return true;
  }
}
