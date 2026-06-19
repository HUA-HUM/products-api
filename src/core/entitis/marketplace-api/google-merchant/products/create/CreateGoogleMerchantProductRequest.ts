export interface CreateGoogleMerchantProductRequest {
  sku: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  brand: string;
  imageUrl: string;
  productUrl: string;
}

export interface CreateGoogleMerchantProductResponse {
  success: boolean;
  data?: any;
  message?: string;
  statusCode?: number;
  details?: unknown;
  error?: any;
}
