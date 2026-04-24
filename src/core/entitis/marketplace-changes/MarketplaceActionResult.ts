export type MarketplaceName = 'megatone' | 'oncity' | 'fravega';

export type ActionStatus = 'SUCCESS' | 'FAILED';

export type MarketplaceActionResult = {
  marketplace: MarketplaceName;
  status: ActionStatus;
  error?: string;
  durationMs?: number;
};
