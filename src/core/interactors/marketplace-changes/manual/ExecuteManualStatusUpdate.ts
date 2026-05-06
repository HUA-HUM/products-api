import { Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { ManualUpdateInput } from 'src/core/entitis/marketplace-changes/ManualUpdateInput';
import { UpdateMegatoneStatus } from 'src/core/interactors/marketplace-changes/marketplace-actions/status/UpdateMegatoneStatus';
import { UpdateOnCityStatus } from 'src/core/interactors/marketplace-changes/marketplace-actions/status/UpdateOnCityStatus';
import { UpdateFravegaStatus } from 'src/core/interactors/marketplace-changes/marketplace-actions/status/UpdateFravegaStatus';

@Injectable()
export class ExecuteManualStatusUpdate {
  constructor(
    private readonly updateMegatoneStatus: UpdateMegatoneStatus,
    private readonly updateOnCityStatus: UpdateOnCityStatus,
    private readonly updateFravegaStatus: UpdateFravegaStatus
  ) {}

  async execute(input: ManualUpdateInput): Promise<MarketplaceActionResult> {
    console.log(
      `[MKT-CHANGES] Manual status update | SKU=${input.sku} | marketplace=${input.marketplace} | value=${input.valorNuevo}`
    );
    const params = { sku: input.sku, valorNuevo: input.valorNuevo };

    switch (input.marketplace) {
      case 'megatone':
        return this.updateMegatoneStatus.execute(params);
      case 'oncity':
        return this.updateOnCityStatus.execute(params);
      case 'fravega':
        return this.updateFravegaStatus.execute(params);
    }
  }
}
