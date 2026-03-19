export class ResolveFravegaPrices {
  execute(price: number) {
    if (!price || price <= 0) {
      throw new Error('INVALID_PRICE');
    }

    const list = Math.round(price);

    const discount = list * 0.03;
    let sale = Math.round(list - discount);

    if (sale >= list) {
      sale = list - 1;
    }

    if (sale <= 0) {
      throw new Error('INVALID_SALE_PRICE');
    }

    /* ======================================
       NET (por ahora igual al sale)
    ====================================== */
    const net = sale;

    return {
      list,
      sale,
      net
    };
  }
}
