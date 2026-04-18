import { Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { ManualUpdateInput } from 'src/core/entitis/marketplace-changes/ManualUpdateInput';
import { UpdateMegatonePrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateMegatonePrice';
import { UpdateOnCityPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateOnCityPrice';
import { UpdateFravegaPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateFravegaPrice';

@Injectable()
export class ExecuteManualPriceUpdate {
  constructor(
    private readonly updateMegatonePrice: UpdateMegatonePrice,
    private readonly updateOnCityPrice: UpdateOnCityPrice,
    private readonly updateFravegaPrice: UpdateFravegaPrice
  ) {}

  async execute(input: ManualUpdateInput): Promise<MarketplaceActionResult> {
    console.log(
      `[MKT-CHANGES] Manual price update | SKU=${input.sku} | marketplace=${input.marketplace} | value=${input.valorNuevo}`
    );
    const params = { sku: input.sku, valorNuevo: input.valorNuevo };

    switch (input.marketplace) {
      case 'megatone':
        return this.updateMegatonePrice.execute(params);
      case 'oncity':
        return this.updateOnCityPrice.execute(params);
      case 'fravega':
        return this.updateFravegaPrice.execute(params);
    }
  }
}
