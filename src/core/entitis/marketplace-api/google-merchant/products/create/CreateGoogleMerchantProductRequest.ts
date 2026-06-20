export interface CreateGoogleMerchantProductShipping {
  country: string;
  service: string;
  price: number;
  minHandlingTime: number;
  maxHandlingTime: number;
  minTransitTime: number;
  maxTransitTime: number;
}

export interface CreateGoogleMerchantProductRequest {
  sku: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  brand: string;
  imageUrl: string;
  productUrl: string;
  additionalImageUrls: string[];
  condition: string;
  googleProductCategory: string;
  mpn: string;
  identifierExists: boolean;
  shipping: CreateGoogleMerchantProductShipping[];
}

export interface CreateGoogleMerchantProductResponse {
  success: boolean;
  data?: any;
  message?: string;
  statusCode?: number;
  details?: unknown;
  error?: any;
}
