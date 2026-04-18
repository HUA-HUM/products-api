import { MadreDeltaCursor, MadreDeltaChangesResponse } from 'src/core/entitis/madre-api/product-delta/MadreDeltaChange';

export interface IMadreProductDeltaRepository {
  getCursor(syncKey: string): Promise<MadreDeltaCursor>;
  getChanges(params: { afterId: number; limit: number }): Promise<MadreDeltaChangesResponse>;
  saveCursor(params: { syncKey: string; lastDeltaId: number }): Promise<void>;
}
