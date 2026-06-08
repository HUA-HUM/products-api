export interface GoogleMerchantProductDestinationStatus {
  reportingContext?: string;
  approvedCountries?: string[];
  disapprovedCountries?: string[];
  pendingCountries?: string[];
}

export interface GoogleMerchantProductIssue {
  code?: string;
  severity?: string;
  resolution?: string;
  attribute?: string;
  reportingContext?: string;
  description?: string;
  detail?: string;
  documentation?: string;
  applicableCountries?: string[];
}

export interface GoogleMerchantProductStatus {
  destinationStatuses?: GoogleMerchantProductDestinationStatus[];
  itemLevelIssues?: GoogleMerchantProductIssue[];
  creationDate?: string;
  lastUpdateDate?: string;
  googleExpirationDate?: string;
}

export interface GoogleMerchantProductShipping {
  country?: string;
}

export interface GoogleMerchantProductAttributes {
  title?: string | null;
  link?: string | null;
  imageLink?: string | null;
  brand?: string | null;
  condition?: string | null;
  shipping?: GoogleMerchantProductShipping[];
}

export interface GoogleMerchantProduct {
  name: string;
  offerId: string;
  contentLanguage?: string;
  feedLabel?: string;
  dataSource?: string;
  productStatus?: GoogleMerchantProductStatus;
  productAttributes?: GoogleMerchantProductAttributes;
  base64EncodedName?: string;
}

export interface GoogleMerchantProductsPaginatedResponse {
  products: GoogleMerchantProduct[];
  nextPageToken?: string;
}
