import { Injectable } from '@nestjs/common';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { MarketplaceImportStrategy } from '../MarketplaceImportStrategy';
import { MegatoneImportStrategy } from '../strategies/MegatoneImportStrategy';
import { OnCityImportStrategy } from '../strategies/OnCityImportStrategy';
import { FravegaImportStrategy } from '../strategies/FravegaImportStrategy';
import { GoogleMerchantImportStrategy } from '../strategies/GoogleMerchantImportStrategy';

@Injectable()
export class MarketplaceImportStrategyResolver {
  private readonly strategies: MarketplaceImportStrategy[];

  constructor(
    private readonly megatoneStrategy: MegatoneImportStrategy,
    private readonly onCityStrategy: OnCityImportStrategy,
    private readonly fravegaStrategy: FravegaImportStrategy,
    private readonly googleMerchantStrategy: GoogleMerchantImportStrategy
  ) {
    this.strategies = [this.megatoneStrategy, this.onCityStrategy, this.fravegaStrategy, this.googleMerchantStrategy];
  }

  resolve(marketplace: ProductSyncMarketplace): MarketplaceImportStrategy {
    const strategy = this.strategies.find(s => s.marketplace === marketplace);

    if (!strategy) {
      throw new Error(`No import strategy for marketplace ${marketplace}`);
    }

    return strategy;
  }
}
