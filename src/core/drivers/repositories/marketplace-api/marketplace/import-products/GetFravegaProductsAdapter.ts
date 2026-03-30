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
    const total = Number(response.total ?? 0);
    const computedHasNext = offset + items.length < total;

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
      hasNext: computedHasNext,
      nextOffset: computedHasNext ? offset + items.length : undefined
    };
  }
}
