import { OnCityRawProduct } from 'src/core/entitis/marketplace-api/oncity/products/get/OnCityRawProduct';
import { OnCityUpdateProductRequest } from 'src/core/entitis/marketplace-api/oncity/products/update-status/OnCityUpdateProductRequest';

const HARDCODED_ORIGIN = 'tiendaloquieroaca924';

export function mapOnCityRawToUpdateRequest(
  raw: OnCityRawProduct,
  status: 'active' | 'inactive'
): OnCityUpdateProductRequest {
  const refId = raw.AlternateIds?.RefId ?? '';
  const ean = raw.AlternateIds?.Ean ?? '';
  const productIdStr = String(raw.ProductId ?? raw.Id);
  const skuIdStr = String(raw.Id);

  const categoryIds = parseCategoryIds(raw.ProductCategoryIds);
  const slug = parseSlug(raw.DetailUrl);
  const images = (raw.Images ?? []).map(img => ({
    id: extractImageId(img.ImageUrl) ?? img.ImageName ?? '',
    url: img.ImageUrl,
    alt: img.ImageName ?? undefined
  }));

  const dim = raw.Dimension ?? {};

  return {
    id: productIdStr,
    externalId: refId,
    status,
    name: raw.NameComplete ?? raw.ProductName ?? '',
    description: raw.ProductDescription ?? '',
    brandId: raw.BrandId ?? '',
    categoryIds,
    specs: [],
    attributes: [],
    slug,
    images,
    skus: [
      {
        id: skuIdStr,
        externalId: refId,
        name: raw.SkuName ?? raw.NameComplete ?? '',
        ean,
        isActive: status === 'active',
        weight: dim.weight ?? 0,
        dimensions: {
          width: dim.width ?? 0,
          height: dim.height ?? 0,
          length: dim.length ?? 0
        },
        specs: raw.SkuSpecifications ?? [],
        images: images.map(i => i.id)
      }
    ],
    origin: HARDCODED_ORIGIN
  };
}

function parseCategoryIds(value?: string | null): string[] {
  if (!value) return [];
  return value.split('/').map(s => s.trim()).filter(Boolean);
}

function parseSlug(detailUrl?: string | null): string {
  if (!detailUrl) return '';
  const cleaned = detailUrl.replace(/^\/+|\/+$/g, '');
  const segments = cleaned.split('/').filter(Boolean);
  if (segments.length === 0) return '';
  if (segments[segments.length - 1] === 'p' && segments.length >= 2) {
    return segments[segments.length - 2];
  }
  return segments[segments.length - 1];
}

function extractImageId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop();
    return last ?? null;
  } catch {
    const last = url.split('/').filter(Boolean).pop();
    return last ?? null;
  }
}
