import { Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { ManualUpdateInput } from 'src/core/entitis/marketplace-changes/ManualUpdateInput';
import { UpdateMegatoneStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateMegatoneStock';
import { UpdateOnCityStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateOnCityStock';
import { UpdateFravegaStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateFravegaStock';

@Injectable()
export class ExecuteManualStockUpdate {
  constructor(
    private readonly updateMegatoneStock: UpdateMegatoneStock,
    private readonly updateOnCityStock: UpdateOnCityStock,
    private readonly updateFravegaStock: UpdateFravegaStock
  ) {}

  async execute(input: ManualUpdateInput): Promise<MarketplaceActionResult> {
    console.log(
      `[MKT-CHANGES] Manual stock update | SKU=${input.sku} | marketplace=${input.marketplace} | value=${input.valorNuevo}`
    );
    const params = { sku: input.sku, valorNuevo: input.valorNuevo };

    switch (input.marketplace) {
      case 'megatone':
        return this.updateMegatoneStock.execute(params);
      case 'oncity':
        return this.updateOnCityStock.execute(params);
      case 'fravega':
        return this.updateFravegaStock.execute(params);
    }
  }
}
