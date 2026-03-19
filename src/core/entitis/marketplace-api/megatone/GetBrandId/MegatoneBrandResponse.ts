export type MegatoneBrandResponse = {
  status: string;
  data: MegatoneBrandData;
};

export type MegatoneBrandData = {
  id: number;
  meli_brand: string;
  megatone_brand_id: string;
  megatone_brand_name: string;
  confidence: string;
  created_at: string;
};
