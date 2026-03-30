import { Inject, Injectable } from '@nestjs/common';
import { IGetMarketplaceProductsRepository } from 'src/core/adapters/repositories/marketplace/marketplace/import-products/IGetMarketplaceProductsRepository';
import { IGetFravegaProductsRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/get/IGetFravegaProductsRepository';

@Injectable()
export class GetFravegaProductsAdapter implements IGetMarketplaceProductsRepository {
  constructor(
    @Inject('IGetFravegaProductsRepository')
    private readonly fravegaRepo: IGetFravegaProductsRepository
  ) {}

  async execute(limit: number, offset: number) {
    const response = await this.fravegaRepo.execute(limit, offset);
    const items = response.items ?? [];

    return {
      items: items.map(item => ({
        publicationId: item.id,
        sellerSku: item.refId ?? item.sku,
        marketSku: item.sku ?? null,
        price: item.price?.sale ?? item.price?.list ?? 0,
        stock: item.stock?.quantity ?? 0,
        status: item.status?.code ?? item.itemState ?? 'unknown',
        raw: item
      })),
      hasNext: response.hasNext === true,
      nextOffset: response.nextOffset ?? undefined,
      debug: {
        sourceTotal: response.total ?? null,
        sourceLimit: response.limit ?? null,
        sourceOffset: response.offset ?? null,
        sourceCount: response.count ?? null,
        sourceHasNext: response.hasNext ?? null,
        sourceNextOffset: response.nextOffset ?? null
      }
    };
  }
}
