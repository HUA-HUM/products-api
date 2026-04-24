import { MarketplaceActionResult } from 'src/core/entitis/marketplace-changes/MarketplaceActionResult';

export type OverallStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

export type ChangeCampo = 'precio' | 'stock' | 'estado';

export type ChangeProcessingResult = {
  changeId: number;
  sku: string;
  campo: ChangeCampo;
  results: MarketplaceActionResult[];
  overall: OverallStatus;
};

export function computeOverallStatus(results: MarketplaceActionResult[]): OverallStatus {
  if (results.length === 0) return 'FAILED';

  const successes = results.filter(r => r.status === 'SUCCESS').length;

  if (successes === results.length) return 'SUCCESS';
  if (successes === 0) return 'FAILED';
  return 'PARTIAL';
}
