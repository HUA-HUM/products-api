import { Injectable } from '@nestjs/common';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { MarketplaceImportStrategy } from '../MarketplaceImportStrategy';
import { MegatoneImportStrategy } from '../strategies/MegatoneImportStrategy';
import { OnCityImportStrategy } from '../strategies/OnCityImportStrategy';
import { FravegaImportStrategy } from '../strategies/FravegaImportStrategy';

@Injectable()
export class MarketplaceImportStrategyResolver {
  private readonly strategies: MarketplaceImportStrategy[];

  constructor(
    private readonly megatoneStrategy: MegatoneImportStrategy,
    private readonly onCityStrategy: OnCityImportStrategy,
    private readonly fravegaStrategy: FravegaImportStrategy
  ) {
    this.strategies = [this.megatoneStrategy, this.onCityStrategy, this.fravegaStrategy];
  }

  resolve(marketplace: ProductSyncMarketplace): MarketplaceImportStrategy {
    const strategy = this.strategies.find(s => s.marketplace === marketplace);

    if (!strategy) {
      throw new Error(`No import strategy for marketplace ${marketplace}`);
    }

    return strategy;
  }
}
