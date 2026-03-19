export class BuildMegatonePayload {
  execute(params: {
    product: any;
    categoryId: number;
    brandId: number;
    prices: { precioLista: number; precioPromocional: number };
  }) {
    const { product, categoryId, brandId, prices } = params;

    return {
      MasivaBulks: [
        {
          Titulo: this.buildTitle(product.title),
          DescripcionAmpliada: this.buildDescription(product.description),

          Categoria: categoryId,
          Marca: brandId,

          SkuSeller: product.sku,

          PrecioLista: prices.precioLista,
          PrecioPromocional: prices.precioPromocional,

          Stock: product.stock ?? 1,

          TipoEntrega: 1,
          EnvioGratis: true,
          EnvioPropio: false,

          EnvioGratisZona: {
            Amba: true,
            Interior: true,
            Patagonia: true,
            EnvioGratis: true
          },

          Dimensiones: [
            {
              Alto: 10,
              Ancho: 10,
              Profundidad: 10,
              Peso: 1
            }
          ],

          IdTipoPublicacion: 99,
          IdMoneda: 1,
          AlicuotaIva: 21,
          AlicuotaImpuestoInterno: 0,
          GarantiaExtActiva: false,
          GarantiaFabrica: 0,

          Imagenes: this.buildImages(product.images)
        }
      ]
    };
  }

  /* ======================================
     PRIVATE HELPERS
  ====================================== */

  private buildImages(images: any[]) {
    if (!images?.length) {
      return [
        {
          Posicion: 1,
          UrlImagen: 'https://via.placeholder.com/500'
        }
      ];
    }

    return images
      .filter(img => !!img?.url)
      .slice(0, 5)
      .map((img, index) => ({
        Posicion: index + 1,
        UrlImagen: img.url
      }));
  }

  private buildTitle(title?: string): string {
    if (!title) return '';
    return title.slice(0, 100);
  }

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
