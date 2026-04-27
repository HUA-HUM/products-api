import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IUpdateFravegaStatusRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/update-status/IUpdateFravegaStatusRepository';
import { mapDeltaStatus } from './mapper/MapDeltaStatus';

@Injectable()
export class UpdateFravegaStatus {
  constructor(
    @Inject('IUpdateFravegaStatusRepository')
    private readonly driver: IUpdateFravegaStatusRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();
    console.log(`[MKT-CHANGES] Update fravega status | SKU=${params.sku} | value=${params.valorNuevo}`);

    try {
      const desired = mapDeltaStatus(params.valorNuevo);

      console.log(
        `[MKT-CHANGES] Fravega status payload | SKU=${params.sku} | refId=${params.sku} | desired=${desired}`
      );

      if (desired === 'active') {
        await this.driver.activateByRefId(params.sku);
      } else {
        await this.driver.deactivateByRefId(params.sku);
      }

      console.log(`[MKT-CHANGES] Fravega status response | SKU=${params.sku} | OK`);

      return {
        marketplace: 'fravega',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[MKT-CHANGES] Fravega status update FAILED | SKU=${params.sku} | error=${message}`);

      return {
        marketplace: 'fravega',
        status: 'FAILED',
        error: message,
        durationMs: Date.now() - startedAt
      };
    }
  }
}
