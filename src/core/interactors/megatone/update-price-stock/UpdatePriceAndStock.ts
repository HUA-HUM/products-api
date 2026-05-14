import { Inject, Injectable } from '@nestjs/common';
import { IGetProductSyncItemsRepository } from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncItemsRepository';
import { IUpdateProductSyncItemRepository } from 'src/core/adapters/repositories/madre/product-sync/IUpdateProductSyncItemRepository';
import { IGetMadreProductsRepository } from 'src/core/adapters/repositories/madre/products/get/IGetMadreProductsRepository';
import { IUpdateMegatoneProductsRepository } from 'src/core/adapters/repositories/marketplace/megatone/products/update-price-stock/IUpdateMegatoneProductsRepository';
import { ResolveMegatonePrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/pricing/ResolveMegatonePrice';

@Injectable()
export class UpdatePriceAndStock {
  private readonly LIMIT = 100;

  constructor(
    @Inject('IGetProductSyncItemsRepository')
    private readonly getSyncItems: IGetProductSyncItemsRepository,

    @Inject('IGetMadreProductsRepository')
    private readonly getMadreProducts: IGetMadreProductsRepository,

    @Inject('IUpdateMegatoneProductsRepository')
    private readonly updateMegatone: IUpdateMegatoneProductsRepository,

    @Inject('IUpdateProductSyncItemRepository')
    private readonly updateSyncItem: IUpdateProductSyncItemRepository,

    private readonly resolveMegatonePrice: ResolveMegatonePrice
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

    console.log('[SYNC] Inicio update Price & Stock (Madre → Marketplace)');

    while (true) {
      const page = await this.getSyncItems.listAll('megatone', this.LIMIT, offset);

      if (!page.items.length) {
        console.log('[SYNC] No hay más items para procesar');
        break;
      }

      for (const syncItem of page.items) {
        processed++;

        try {
          const changed = await this.processItem(syncItem);

          if (changed) {
            updated++;
            console.log(
              `[SYNC] ✔ Actualizado | SKU=${syncItem.seller_sku} | price=${syncItem.price} stock=${syncItem.stock}`
            );
          }
        } catch (error) {
          errors++;
          console.log(
            `[SYNC] ✖ Error | SKU=${syncItem.seller_sku} | ${error instanceof Error ? error.message : 'unknown'}`
          );
        }
      }

      if (!page.hasNext) break;
      offset = page.nextOffset!;
    }

    console.log('[SYNC] Fin sync', { processed, updated, errors });

    return { processed, updated, errors };
  }

  /* =====================================================
     PROCESO POR SKU
  ===================================================== */
  private async processItem(syncItem: {
    seller_sku: string;
    external_id: string;
    price: number;
    stock: number;
    status: string;
  }): Promise<boolean> {
    const sellerSku = syncItem.seller_sku;

    /* ---------- SKIP DELETED ---------- */
    if (syncItem.status === 'DELETED') {
      console.log(`[SYNC] ⏭ Skipping DELETED sync_item | SKU=${sellerSku}`);
      return false;
    }

    /* ---------- MADRE ---------- */
    const madreProduct = await this.getMadreProducts.getBySku(sellerSku);

    if (!madreProduct) {
      console.log(`[SYNC] ⚠ No existe en Madre | SKU=${sellerSku}`);

      await this.updateSyncItem.updateBySellerSku(sellerSku, {
        status: 'ERROR',
        raw: {
          source: 'madre-full-sync',
          reason: 'NOT_IN_MADRE',
          checkedAt: new Date().toISOString()
        }
      });

      return false;
    }

    const madrePrice = Number(madreProduct.price);
    const madreStock = Number(madreProduct.stock);

    const syncPrice = Number(syncItem.price);
    const syncStock = Number(syncItem.stock);

    const priceChanged = madrePrice !== syncPrice;
    const stockChanged = madreStock !== syncStock;

    if (!priceChanged && !stockChanged) {
      return false;
    }

    console.log(`[SYNC] Diferencia detectada | SKU=${sellerSku} | Madre(price=${madrePrice}, stock=${madreStock})`);

    /* ---------- ARMADO PRECIOS ---------- */
    let precioLista = madrePrice;
    let precioPromocional: number | undefined;

    if (priceChanged) {
      const promo = await this.resolveMegatonePrice.resolve(sellerSku, madrePrice);
      precioLista = promo.precioLista;
      precioPromocional = promo.precioPromocional;

      console.log(`[SYNC] Promo aplicada | SKU=${sellerSku} | lista=${precioLista} promo=${precioPromocional}`);
    }

    /* ---------- MARKETPLACE (Megatone) ---------- */
    await this.updateMegatone.update({
      items: [
        {
          publicationId: Number(syncItem.external_id),
          precioLista,
          precioPromocional,
          stock: madreStock,
          alicuotaIva: 21,
          alicuotaImpuestoInterno: 0
        }
      ]
    });

    if (madreStock === 0) {
      console.log(`[SYNC] Auto-pause aplicado por stock 0 | SKU=${sellerSku}`);
    }

    /* ---------- SYNC ITEM ---------- */
    const payload: {
      price: number;
      stock: number;
      status?: 'PAUSED';
      raw: Record<string, any>;
    } = {
      price: madrePrice,
      stock: madreStock,
      raw: {
        source: 'madre-full-sync',
        madreUpdatedAt: madreProduct.updatedAt,
        promoApplied: priceChanged ? '3%' : null
      }
    };

    if (madreStock === 0) {
      payload.status = 'PAUSED';

      payload.raw.autoPausedByStock = true;

      console.log(`[SYNC] Auto-pause aplicado por stock 0 | SKU=${sellerSku}`);
    }

    await this.updateSyncItem.updateBySellerSku(sellerSku, payload);

    return true;
  }
}
