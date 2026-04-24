import { Inject, Injectable } from '@nestjs/common';
import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { IUpdateFravegaStockRepository } from 'src/core/adapters/repositories/marketplace/fravega/products/update-stock/IUpdateFravegaStockRepository';
import { UpdateFravegaStockRequest } from 'src/core/entitis/marketplace-api/fravega/products/update-stock/UpdateFravegaStockRequest';

@Injectable()
export class UpdateFravegaStock {
  constructor(
    @Inject('IUpdateFravegaStockRepository')
    private readonly driver: IUpdateFravegaStockRepository
  ) {}

  async execute(params: { sku: string; valorNuevo: string }): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();
    console.log(`[MKT-CHANGES] Update fravega stock | SKU=${params.sku} | value=${params.valorNuevo}`);

    try {
      if (params.valorNuevo === null || params.valorNuevo === undefined || String(params.valorNuevo).trim() === '') {
        throw new Error(`Invalid valorNuevo (empty or missing)`);
      }

      const quantity = Number(params.valorNuevo);

      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error(`Invalid valorNuevo (must be integer >= 0): ${params.valorNuevo}`);
      }

      const payload: UpdateFravegaStockRequest = { quantity };

      console.log(
        `[MKT-CHANGES] Fravega stock payload | SKU=${params.sku} | refId=${params.sku} | quantity=${quantity}`
      );

      await this.driver.updateByRefId(params.sku, payload);

      console.log(`[MKT-CHANGES] Fravega stock response | SKU=${params.sku} | OK`);

      return {
        marketplace: 'fravega',
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[MKT-CHANGES] Fravega stock update FAILED | SKU=${params.sku} | error=${message}`);

      return {
        marketplace: 'fravega',
        status: 'FAILED',
        error: message,
        durationMs: Date.now() - startedAt
      };
    }
  }
}
