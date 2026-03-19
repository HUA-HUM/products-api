export type MegatoneCreateProductsResponse = {
  status: string; // "OK" | "PARTIAL" | etc
  total: number;
  published: number;
  skipped: number;
  failed: number;
  items: MegatoneCreateProductItem[];
};

export type MegatoneCreateProductItem = {
  skuSeller: string;
  status: string; // "PUBLISHED" | "SKIPPED" | "FAILED"
  errors?: MegatoneError[];
};

export type MegatoneError = {
  target: string;
  message: string;
};
