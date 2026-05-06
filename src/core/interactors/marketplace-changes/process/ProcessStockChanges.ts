import { Injectable, Logger } from '@nestjs/common';
import { MadreDeltaChange } from 'src/core/entitis/madre-api/product-delta/MadreDeltaChange';
import { MarketplaceActionResult, MarketplaceName } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';
import { ChangeProcessingResult, computeOverallStatus } from 'src/core/entitis/marketplace-changes/ChangeProcessingResult';
import { UpdateMegatoneStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateMegatoneStock';
import { UpdateOnCityStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateOnCityStock';
import { UpdateFravegaStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateFravegaStock';
import { isNotPublishedMarketplaceMessage } from 'src/core/interactors/marketplace-changes/marketplace-actions/shared/MarketplacePublicationState';

@Injectable()
export class ProcessStockChanges {
  private readonly logger = new Logger(ProcessStockChanges.name);
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 300;

  constructor(
    private readonly updateMegatoneStock: UpdateMegatoneStock,
    private readonly updateOnCityStock: UpdateOnCityStock,
    private readonly updateFravegaStock: UpdateFravegaStock
  ) {}

  async execute(change: MadreDeltaChange): Promise<ChangeProcessingResult> {
    const valorNuevo = change.valorNuevo ?? '';
    const params = { sku: change.sku, valorNuevo };

    const settled = await Promise.allSettled([
      this.runAction('megatone', () => this.updateMegatoneStock.execute(params)),
      this.runAction('oncity', () => this.updateOnCityStock.execute(params)),
      this.runAction('fravega', () => this.updateFravegaStock.execute(params))
    ]);

    const results: MarketplaceActionResult[] = settled.map(s =>
      s.status === 'fulfilled' ? s.value : (s.reason as MarketplaceActionResult)
    );

    const overall = computeOverallStatus(results);

    if (results.every(r => r.status === 'FAILED' && isNotPublishedMarketplaceMessage(r.error))) {
      this.logger.warn(`[MKT-CHANGES] Stock skipped | SKU=${change.sku} | reason=not-published-in-any-marketplace`);
    } else {
      if (overall === 'SUCCESS') {
        this.logger.log(`[MKT-CHANGES] Stock change done | SKU=${change.sku} | overall=${overall}`);
      } else if (overall === 'PARTIAL') {
        this.logger.warn(`[MKT-CHANGES] Stock change done | SKU=${change.sku} | overall=${overall}`);
      } else {
        this.logger.error(`[MKT-CHANGES] Stock change done | SKU=${change.sku} | overall=${overall}`);
      }

      results.forEach(r => {
        if (r.status === 'SUCCESS') {
          this.logger.log(`  ${r.marketplace}: OK`);
          return;
        }

        if (isNotPublishedMarketplaceMessage(r.error)) {
          this.logger.warn(`  ${r.marketplace}: SKIPPED - ${r.error}`);
          return;
        }

        this.logger.error(`  ${r.marketplace}: FAIL - ${r.error ?? 'unknown'}`);
      });
    }

    return {
      changeId: change.id,
      sku: change.sku,
      campo: 'stock',
      results,
      overall
    };
  }

  private async runAction(
    marketplace: MarketplaceName,
    fn: () => Promise<MarketplaceActionResult>
  ): Promise<MarketplaceActionResult> {
    for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt += 1) {
      const startedAt = Date.now();

      try {
        const result = await fn();
        const normalized = { ...result, durationMs: result.durationMs ?? Date.now() - startedAt };

        if (normalized.status === 'SUCCESS' || isNotPublishedMarketplaceMessage(normalized.error)) {
          return normalized;
        }

        if (attempt === this.MAX_ATTEMPTS) {
          return normalized;
        }

        this.logger.warn(
          `[MKT-CHANGES] Retry stock action | marketplace=${marketplace} | attempt=${attempt + 1}/${this.MAX_ATTEMPTS} | reason=${normalized.error ?? 'unknown'}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (attempt === this.MAX_ATTEMPTS) {
          return {
            marketplace,
            status: 'FAILED',
            error: message,
            durationMs: Date.now() - startedAt
          };
        }

        this.logger.warn(
          `[MKT-CHANGES] Retry stock action | marketplace=${marketplace} | attempt=${attempt + 1}/${this.MAX_ATTEMPTS} | reason=${message}`
        );
      }

      await this.delay(this.RETRY_DELAY_MS * attempt);
    }

    return {
      marketplace,
      status: 'FAILED',
      error: 'Unknown retry exhaustion',
      durationMs: 0
    };
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}
