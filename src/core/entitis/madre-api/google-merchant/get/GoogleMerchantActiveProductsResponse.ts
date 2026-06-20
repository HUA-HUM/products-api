export interface MadreGoogleMerchantActiveProduct {
  id: string;
  brand_id: string | null;
  brand?: string | null;
  brand_name?: string | null;
  name: string | null;
  images: string[];
  description: string | null;
  price: string | number | null;
  is_active: number;
  in_stock: number;
  asin: string | null;
  sale_price: string | number | null;
  features?: string | string[] | null;
  categoryTree?: Array<{
    name?: string | null;
    catId?: string | number | null;
  }> | null;
  compuesto_amazon?: string | null;
  partNumber?: string | null;
  model?: string | null;
  slug?: string | null;
  name_esp?: string | null;
  features_esp?: string | string[] | null;
  description_esp?: string | null;
}

export interface MadreGoogleMerchantActiveProductsResponse {
  items: MadreGoogleMerchantActiveProduct[];
  limit: number;
  offset: number;
  count: number;
  total: number;
  hasNext: boolean;
  nextOffset: number | null;
}
