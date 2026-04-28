import { Injectable } from '@nestjs/common';
import { MadreDeltaChange } from 'src/core/entitis/madre-api/product-delta/MadreDeltaChange';
import { MarketplaceActionResult, MarketplaceName } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { ChangeProcessingResult, computeOverallStatus } from 'src/core/entitis/marketplace-changes/ChangeProcessingResult';
import { UpdateMegatonePrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateMegatonePrice';
import { UpdateOnCityPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateOnCityPrice';
import { UpdateFravegaPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateFravegaPrice';

@Injectable()
export class ProcessPriceChanges {
  constructor(
    private readonly updateMegatonePrice: UpdateMegatonePrice,
    private readonly updateOnCityPrice: UpdateOnCityPrice,
    private readonly updateFravegaPrice: UpdateFravegaPrice
  ) {}

  async execute(change: MadreDeltaChange): Promise<ChangeProcessingResult> {
    const valorNuevo = change.valorNuevo ?? '';
    const params = { sku: change.sku, valorNuevo };

    const settled = await Promise.allSettled([
      this.runAction('megatone', () => this.updateMegatonePrice.execute(params)),
      this.runAction('oncity', () => this.updateOnCityPrice.execute(params)),
      this.runAction('fravega', () => this.updateFravegaPrice.execute(params))
    ]);

    const results: MarketplaceActionResult[] = settled.map(s =>
      s.status === 'fulfilled' ? s.value : (s.reason as MarketplaceActionResult)
    );

    const overall = computeOverallStatus(results);

    console.log(`[MKT-CHANGES] Price change done | SKU=${change.sku} | overall=${overall}`);
    results.forEach(r => {
      const line =
        r.status === 'SUCCESS' ? `  ${r.marketplace}: OK` : `  ${r.marketplace}: FAIL - ${r.error ?? 'unknown'}`;
      console.log(line);
    });

    return {
      changeId: change.id,
      sku: change.sku,
      campo: 'precio',
      results,
      overall
    };
  }

  private async runAction(
    marketplace: MarketplaceName,
    fn: () => Promise<MarketplaceActionResult>
  ): Promise<MarketplaceActionResult> {
    const startedAt = Date.now();
    try {
      const result = await fn();
      return { ...result, durationMs: result.durationMs ?? Date.now() - startedAt };
    } catch (error) {
      return {
        marketplace,
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt
      };
    }
  }
}
