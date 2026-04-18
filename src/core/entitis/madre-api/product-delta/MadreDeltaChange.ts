export type MadreDeltaChange = {
  id: number;
  productoId: number;
  sku: string;
  campo: 'precio' | 'stock' | 'estado';
  valorAnterior: string | null;
  valorNuevo: string | null;
  operacion: string;
  origen: string;
  loteId: number | null;
  hashIdem: string;
  createdAt: string;
};

export type MadreDeltaChangesResponse = {
  items: MadreDeltaChange[];
  lastId: number | null;
  hasMore: boolean;
};

export type MadreDeltaCursor = {
  syncKey: string;
  lastDeltaId: number;
  updatedAt?: string;
};
