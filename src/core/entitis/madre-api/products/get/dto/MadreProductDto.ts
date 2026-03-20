export interface MadreProductDto {
  id: number;
  sku: string;

  title: string;
  description: string;

  categoryId: string;
  meliStatus?: string;
  amzStatus?: string;

  price: number;
  stock: number;
  status: string;

  images: {
    position: number;
    url: string;
  }[];

  attributes: {
    brand?: string;
    color?: string;
    model?: string;
    material?: string;
    size?: string;
    raw?: any;
  };

  updatedAt: string;
}
