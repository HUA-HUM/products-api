import { Injectable } from '@nestjs/common';
import {
  CreateOnCityProductRequest,
  OnCityCreateProductImage
} from 'src/core/entitis/marketplace-api/oncity/CreateProducts/CreateOnCityProduct';

const GENERIC_IMAGE_ID = 'generic-oncity-image.jpg';
const GENERIC_IMAGE_URL =
  'https://tiendaloquieroaca924.vtexassets.com/assets/vtex.catalog-images/products/image-test-01___hash.jpg';
const GENERIC_IMAGE_ALT = 'Imagen generica';

@Injectable()
export class BuildOnCityPayload {
  execute(params: {
    product: any;
    brandId: string;
    categoryIds: string[];
  }): CreateOnCityProductRequest {
    const { product, brandId, categoryIds } = params;
    const name = this.buildName(product.title);
    const images = this.buildImages();

    return {
      externalId: product.sku,
      status: 'active',
      name,
      description: this.buildDescription(product.description),
      brandId,
      categoryIds,
      specs: [],
      attributes: [],
      slug: this.buildSlug(product.title),
      images,
      skus: [
        {
          externalId: product.sku,
          name,
          ean: this.resolveEan(product.sku),
          isActive: true,
          weight: 1,
          dimensions: {
            width: 1,
            height: 1,
            length: 1
          },
          specs: [],
          images: images.map(image => image.id)
        }
      ],
      origin: process.env.ONCITY_VTEX_ACCOUNT ?? 'tiendaloquieroaca924'
    };
  }

  private buildName(title?: string): string {
    const normalized = (title ?? '').replace(/\s+/g, ' ').trim();

    if (normalized.length <= 150) {
      return normalized;
    }

    const sliced = normalized.slice(0, 150);
    const lastSpace = sliced.lastIndexOf(' ');

    if (lastSpace < 80) {
      return sliced.trim();
    }

    return sliced.slice(0, lastSpace).trim();
  }

  private buildDescription(description?: string): string {
    if (!description) {
      return '';
    }

    const normalized = description.replace(/\r/g, '').trim();
    const marker = 'DETALLES:';
    const detailsIndex = normalized.indexOf(marker);

    let base = normalized;

    if (detailsIndex >= 0) {
      base = normalized.slice(detailsIndex + marker.length).trim();
    }

    base = base
      .replace(/TABLA DE CARACTERISTICAS:[\s\S]*$/i, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return base.slice(0, 4000);
  }

  private buildSlug(title?: string): string {
    const base = (title ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return `/${base || 'producto-sin-nombre'}`;
  }

  private resolveEan(sku?: string): string {
    return (sku ?? '').trim();
  }

  private buildImages(): OnCityCreateProductImage[] {
    return [
      {
        id: GENERIC_IMAGE_ID,
        url: GENERIC_IMAGE_URL,
        alt: GENERIC_IMAGE_ALT
      }
    ];
  }
}
