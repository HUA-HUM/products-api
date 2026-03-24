export interface FravegaProduct {
  id: string;
  sku: string;
  refId?: string | null;
  active?: boolean;
  itemState?: string;
  status?: {
    code?: string;
    message?: string;
  };
  price?: {
    list?: number;
    sale?: number;
    net?: number;
  };
  stock?: {
    quantity?: number;
  };
}
