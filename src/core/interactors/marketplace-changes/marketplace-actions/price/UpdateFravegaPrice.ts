import { Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';

@Injectable()
export class UpdateFravegaPrice {
  execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    console.log(`[MKT-CHANGES] Update fravega price | SKU=${params.sku} | value=${params.valorNuevo}`);
    return Promise.reject(new Error('NOT_IMPLEMENTED: UpdateFravegaPrice'));
  }
}
