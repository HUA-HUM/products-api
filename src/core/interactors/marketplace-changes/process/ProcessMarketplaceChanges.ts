import { Injectable } from '@nestjs/common';
import { MadreDeltaChange } from 'src/core/entitis/madre-api/product-delta/MadreDeltaChange';
import { ChangeProcessingResult } from 'src/core/entitis/marketplace-changes/ChangeProcessingResult';
import { ProcessPriceChanges } from 'src/core/interactors/marketplace-changes/process/ProcessPriceChanges';
import { ProcessStockChanges } from 'src/core/interactors/marketplace-changes/process/ProcessStockChanges';
import { ProcessStatusChanges } from 'src/core/interactors/marketplace-changes/process/ProcessStatusChanges';

@Injectable()
export class ProcessMarketplaceChanges {
  constructor(
    private readonly processPriceChanges: ProcessPriceChanges,
    private readonly processStockChanges: ProcessStockChanges,
    private readonly processStatusChanges: ProcessStatusChanges
  ) {}

  async processPage(items: MadreDeltaChange[]): Promise<ChangeProcessingResult[]> {
    console.log(`[MKT-CHANGES] Processing page | items=${items.length}`);
    const results: ChangeProcessingResult[] = [];

    for (const item of items) {
      results.push(await this.processSingle(item));
    }

    const summary = results.reduce(
      (acc, r) => {
        acc[r.overall] = (acc[r.overall] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log(
      `[MKT-CHANGES] Page done | SUCCESS=${summary.SUCCESS ?? 0} PARTIAL=${summary.PARTIAL ?? 0} FAILED=${summary.FAILED ?? 0}`
    );

    return results;
  }

  async processSingle(change: MadreDeltaChange): Promise<ChangeProcessingResult> {
    console.log(`[MKT-CHANGES] Change ${change.operacion} ${change.campo} | SKU=${change.sku} | id=${change.id}`);

    if (change.operacion !== 'UPDATE') {
      console.log(`[MKT-CHANGES] Skip | unsupported operacion=${change.operacion} | id=${change.id}`);
      return {
        changeId: change.id,
        sku: change.sku,
        campo: change.campo,
        results: [],
        overall: 'FAILED'
      };
    }

    switch (change.campo) {
      case 'precio':
        return this.processPriceChanges.execute(change);
      case 'stock':
        return this.processStockChanges.execute(change);
      case 'estado':
        return this.processStatusChanges.execute(change);
      default: {
        console.log(`[MKT-CHANGES] Skip | unsupported campo=${String(change.campo)} | id=${change.id}`);
        return {
          changeId: change.id,
          sku: change.sku,
          campo: change.campo,
          results: [],
          overall: 'FAILED'
        };
      }
    }
  }
}
