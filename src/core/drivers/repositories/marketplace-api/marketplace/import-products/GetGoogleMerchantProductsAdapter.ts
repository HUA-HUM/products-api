import { Inject, Injectable } from '@nestjs/common';
import { IGetMarketplaceProductsRepository } from 'src/core/adapters/repositories/marketplace/marketplace/import-products/IGetMarketplaceProductsRepository';
import { IGetGoogleMerchantProductsRepository } from 'src/core/adapters/repositories/marketplace/google-merchant/products/get/IGetGoogleMerchantProductsRepository';
import { GoogleMerchantProduct } from 'src/core/entitis/marketplace-api/google-merchant/products/get/GoogleMerchantProductsPaginatedResponse';

@Injectable()
export class GetGoogleMerchantProductsAdapter implements IGetMarketplaceProductsRepository {
  private readonly pageTokensByOffset = new Map<number, string | undefined>([[0, undefined]]);

  constructor(
    @Inject('IGetGoogleMerchantProductsRepository')
    private readonly googleMerchantRepo: IGetGoogleMerchantProductsRepository
  ) {}

  async execute(limit: number, offset: number) {
    if (offset === 0) {
      this.pageTokensByOffset.clear();
      this.pageTokensByOffset.set(0, undefined);
    }

    const pageToken = this.pageTokensByOffset.get(offset);
    const response = await this.googleMerchantRepo.execute(limit, pageToken);
    const items = response.products ?? [];
    const nextOffset = offset + items.length;

    if (response.nextPageToken) {
      this.pageTokensByOffset.set(nextOffset, response.nextPageToken);
    }

    return {
      items: items.map(item => ({
        publicationId: item.base64EncodedName ?? item.name ?? item.offerId,
        sellerSku: item.offerId,
        marketSku: item.offerId,
        price: 0,
        stock: 0,
        status: this.resolveStatus(item),
        raw: item
      })),
      hasNext: typeof response.nextPageToken === 'string' && response.nextPageToken.length > 0,
      nextOffset: typeof response.nextPageToken === 'string' && response.nextPageToken.length > 0 ? nextOffset : undefined,
      debug: {
        sourcePageSize: limit,
        sourceOffset: offset,
        sourceCount: items.length,
        sourceNextPageToken: response.nextPageToken ?? null
      }
    };
  }

  private resolveStatus(item: GoogleMerchantProduct): string {
    const issues = item.productStatus?.itemLevelIssues ?? [];
    const destinationStatuses = item.productStatus?.destinationStatuses ?? [];

    const hasDisapprovedIssue = issues.some(issue => issue?.severity?.toUpperCase() === 'DISAPPROVED');
    const hasDisapprovedDestination = destinationStatuses.some(
      destination => Array.isArray(destination.disapprovedCountries) && destination.disapprovedCountries.length > 0
    );

    if (hasDisapprovedIssue || hasDisapprovedDestination) {
      return 'DISAPPROVED';
    }

    return 'ACTIVE';
  }
}
