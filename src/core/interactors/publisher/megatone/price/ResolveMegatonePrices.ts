export class ResolveMegatonePrices {
  execute(price: number): {
    precioLista: number;
    precioPromocional: number;
  } {
    if (!price || price <= 0) {
      throw new Error('INVALID_PRICE');
    }

    /* ======================================
       REGLA DE NEGOCIO
    ====================================== */
    const descuento = price * 0.05;
    let precioPromocional = Math.round(price - descuento);

    /* ======================================
       GARANTÍA: promo < lista
    ====================================== */
    if (precioPromocional >= price) {
      precioPromocional = price - 1;
    }

    return {
      precioLista: price,
      precioPromocional
    };
  }
}
