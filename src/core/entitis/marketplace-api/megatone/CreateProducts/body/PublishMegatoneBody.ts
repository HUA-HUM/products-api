export type PublishMegatoneBody = {
  MasivaBulks: MegatoneProduct[];
};

export type MegatoneProduct = {
  Titulo: string;
  DescripcionAmpliada: string;
  Categoria: number;
  Marca: number;
  SkuSeller: string;
  PrecioLista: number;
  PrecioPromocional?: number;
  Stock: number;
  TipoEntrega: number;
  EnvioGratis: boolean;
  EnvioPropio: boolean;

  EnvioGratisZona: {
    Amba: boolean;
    Interior: boolean;
    Patagonia: boolean;
    EnvioGratis: boolean;
  };

  Dimensiones: {
    Alto: number;
    Ancho: number;
    Profundidad: number;
    Peso: number;
  }[];

  IdTipoPublicacion: number;
  IdMoneda: number;
  AlicuotaIva: number;
  AlicuotaImpuestoInterno: number;

  GarantiaExtActiva: boolean;
  GarantiaFabrica: number;

  Imagenes: {
    Posicion: number;
    UrlImagen: string;
  }[];
};
