export class BuildFravegaPayload {
  execute(params: {
    product: any;
    categoryId: string;
    brandId: string | null;
    attributes: { id: string; value: any }[];
    prices: {
      list: number;
      sale: number;
      net: number;
    };
  }) {
    const { product, categoryId, brandId, attributes, prices } = params;

    const title = this.buildTitle(product.title);

    return {
      items: [
        {
          /* ======================================
             IDENTIFICACIÓN
          ====================================== */
          ean: '00000000',
          refId: product.sku,

          /* ======================================
             TITLE
          ====================================== */
          title,
          subTitle: title,

          description: this.buildDescription(product.description),

          primaryCategoryId: categoryId,

          brandId: brandId,

          /* ======================================
             PRICE
          ====================================== */
          price: {
            list: prices.list,
            sale: prices.sale,
            net: prices.net
          },

          /* ======================================
             STOCK
          ====================================== */
          stock: {
            quantity: product.stock ?? 1
          },

          /* ======================================
             DIMENSIONS
          ====================================== */
          dimensions: {
            height: 10,
            length: 10,
            width: 10,
            weight: 1
          },

          /* ======================================
             META
          ====================================== */
          origin: 'AR',
          countryId: 'AR',
          active: true,

          /* ======================================
             ATTRIBUTES
          ====================================== */
          attributes: this.buildAttributes(attributes),

          /* ======================================
             IMAGES
          ====================================== */
          images: this.buildImages(product.images)
        }
      ]
    };
  }

  /* ======================================
     ATTRIBUTES (SIN BRAND)
  ====================================== */
  private buildAttributes(attributes: { id: string; value: any }[]) {
    return attributes.map(attr => ({
      name: attr.id,
      value: attr.value
    }));
  }

  /* ======================================
     IMAGES (MAX 5)
  ====================================== */
  private buildImages(images: any[]) {
    if (!images?.length) {
      return [
        {
          type: 'url',
          url: 'http://via.placeholder.com/500.jpg'
        }
      ];
    }

    return images
      .filter(img => !!img?.url)
      .slice(0, 5)
      .map(img => ({
        type: 'url',
        url: this.normalizeImageUrl(img.url)
      }));
  }

  private normalizeImageUrl(url: string): string {
    try {
      const parsed = new URL(url);

      if (parsed.hostname === 'http2.mlstatic.com') {
        parsed.protocol = 'http:';
      }

      return parsed.toString();
    } catch {
      return url;
    }
  }

  /* ======================================
     TITLE (MAX 100)
  ====================================== */
  private buildTitle(title?: string): string {
    if (!title) return '';

    return title.slice(0, 100);
  }

  /* ======================================
     DESCRIPTION
  ====================================== */
  private buildDescription(description?: string): string {
    if (!description) return '';

    const marker = 'DESCRIPCION:';
    const index = description.indexOf(marker);

    if (index === -1) {
      return description.slice(0, 2000);
    }

    let clean = description.slice(index + marker.length).trim();

    clean = clean.replace(/^[:\d\s-]+/, '');

    return clean.slice(0, 2000);
  }
}
