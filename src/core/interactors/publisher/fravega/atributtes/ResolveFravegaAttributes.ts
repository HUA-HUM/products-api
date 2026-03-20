import { Inject, Injectable } from '@nestjs/common';
import { FravegaCategoryAttribute } from 'src/core/entitis/marketplace-api/fravega/GetAtributtes/FravegaCategoryAttribute';
import { IGetFravegaCategoriesTreeRepository } from 'src/core/adapters/repositories/marketplace/fravega/GetCategoriesTree/IGetFravegaCategoriesTreeRepository';
import { IOpenAIAttributesExtractor } from 'src/core/adapters/repositories/openAi/IOpenAIAttributesExtractor';

@Injectable()
export class ResolveFravegaAttributes {
  constructor(
    @Inject('IGetFravegaCategoriesTreeRepository')
    private readonly categoriesRepository: IGetFravegaCategoriesTreeRepository,

    @Inject('IOpenAIAttributesExtractor')
    private readonly openAI: IOpenAIAttributesExtractor
  ) {}

  async execute(categoryId: string, product: any): Promise<{ id: string; value: string | number | boolean }[] | null> {
    /* ======================================
       1. GET CATEGORY ATTRIBUTES
    ====================================== */
    const categoryAttributes = await this.getCategoryAttributes(categoryId);

    if (!categoryAttributes?.length) {
      console.log('[FRAVEGA ATTR] No attributes found for category', {
        categoryId,
        sku: product?.sku ?? null
      });
      return [];
    }

    /* ======================================
       2. FILTRAR REQUERIDOS
    ====================================== */
    const requiredAttributes = categoryAttributes.filter(attr => attr.required);

    /* ======================================
       3. OPENAI (solo para requeridos)
    ====================================== */
    const aiValues = await this.openAI.extract({
      description: product.description,
      attributes: requiredAttributes.map(attr => ({
        name: attr.name
      }))
    });

    /* ======================================
       4. BUILD FINAL ATTRIBUTES
    ====================================== */
    const result: { id: string; value: string | number | boolean }[] = [];

    for (const attr of requiredAttributes) {
      let value: any = null;

      /* ======================================
         LOCAL (si tenés algo)
      ====================================== */
      value = this.tryLocal(product, attr.name);

      /* ======================================
         OPENAI FALLBACK
      ====================================== */
      if (!value) {
        value = aiValues?.[attr.name];
      }

      /* ======================================
         DEFAULT
      ====================================== */
      if (!value) {
        value = this.getDefaultValue(attr.type);
      }

      value = this.sanitizeValueByType(value, attr.type);
      value = this.normalizeToAllowedOption(value, attr);

      /* ======================================
         VALIDACIÓN
      ====================================== */
      if (attr.required && (value === null || value === undefined)) {
        console.log('[FRAVEGA ATTR] Missing required attribute', {
          categoryId,
          sku: product?.sku ?? null,
          attribute: attr.name,
          type: attr.type
        });
        return null; // 🚨 skip producto
      }

      result.push({
        id: attr.name,
        value
      });
    }

    return result;
  }

  private async getCategoryAttributes(categoryId: string): Promise<FravegaCategoryAttribute[]> {
    const categories = await this.categoriesRepository.getLeafCategories();
    const category = categories.find(item => item.id === categoryId);

    if (!category?.attributes?.length) {
      return [];
    }

    return category.attributes
      .filter(attribute => Boolean(attribute.name))
      .map(attribute => ({
        id: attribute.ID ?? attribute.id ?? attribute.name,
        name: attribute.name,
        required: attribute.required ?? false,
        type: attribute.type ?? 'text',
        valueOptions: attribute.valueOptions ?? []
      }));
  }

  /* ======================================
     LOCAL EXTRACTOR (simple)
  ====================================== */
  private tryLocal(product: any, attrName: string): any {
    const raw = product?.attributes?.raw || {};
    const title = String(product?.title ?? '');
    const description = String(product?.description ?? '');
    const fullText = `${title} ${description}`.toLowerCase();

    const map: Record<string, string> = {
      Color: raw.color,
      Marca: raw.marca
    };

    if (attrName === 'Forma') {
      if (fullText.includes('plegable') || fullText.includes('foldable')) {
        return 'Plegable';
      }

      if (fullText.includes('esquinero')) {
        return 'Esquinero';
      }

      if (fullText.includes('en l')) {
        return 'En L';
      }

      return 'Otros';
    }

    return map[attrName] || null;
  }

  private getDefaultValue(type?: string): string | number | boolean | null {
    const normalizedType = type?.toLowerCase();

    if (!normalizedType || normalizedType === 'text' || normalizedType === 'string') {
      return null;
    }

    if (normalizedType === 'integer' || normalizedType === 'number' || normalizedType === 'float') {
      return 0;
    }

    if (normalizedType === 'boolean' || normalizedType === 'bool') {
      return false;
    }

    return null;
  }

  private sanitizeValueByType(value: any, type?: string): string | number | boolean | null {
    const normalizedType = type?.toLowerCase();

    if (normalizedType === 'integer' || normalizedType === 'number' || normalizedType === 'float') {
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (normalizedType === 'boolean' || normalizedType === 'bool') {
      if (typeof value === 'boolean') {
        return value;
      }

      const normalizedValue = String(value).trim().toLowerCase();

      if (['si', 'sí', 'true', '1', 'yes'].includes(normalizedValue)) {
        return true;
      }

      if (['no', 'false', '0'].includes(normalizedValue)) {
        return false;
      }

      return false;
    }

    return value;
  }

  private normalizeToAllowedOption(
    value: string | number | boolean | null,
    attr: FravegaCategoryAttribute
  ): string | number | boolean | null {
    if (value === null || value === undefined) {
      return value;
    }

    const options = attr.valueOptions ?? [];

    if (!options.length) {
      return value;
    }

    const normalizedValue = this.normalizeText(String(value));
    const exactMatch = options.find(option => this.normalizeText(option.v) === normalizedValue);

    if (exactMatch) {
      return exactMatch.v;
    }

    const heuristicMap = this.buildOptionHeuristics(String(value), attr.name);
    const heuristicMatch = heuristicMap
      .map(candidate => options.find(option => this.normalizeText(option.v) === this.normalizeText(candidate)))
      .find(Boolean);

    return heuristicMatch?.v ?? null;
  }

  private buildOptionHeuristics(value: string, attrName: string): string[] {
    const normalizedValue = this.normalizeText(value);
    const normalizedAttr = this.normalizeText(attrName);

    if (normalizedAttr.includes('color')) {
      const colorMap: Record<string, string[]> = {
        black: ['Negro'],
        blanco: ['Blanco'],
        white: ['Blanco'],
        grey: ['Gris'],
        gray: ['Gris'],
        red: ['Rojo'],
        blue: ['Azul'],
        green: ['Verde'],
        brown: ['Marrón'],
        pink: ['Rosa']
      };

      return colorMap[normalizedValue] ?? [value];
    }

    if (normalizedAttr.includes('material')) {
      if (normalizedValue.includes('acero')) {
        return ['Acero', 'Metal'];
      }

      if (normalizedValue.includes('metal')) {
        return ['Metal', 'Acero'];
      }

      if (normalizedValue.includes('madera')) {
        return ['Madera'];
      }

      if (normalizedValue.includes('fibra de carbono')) {
        return ['Fibra de carbono'];
      }
    }

    if (normalizedAttr.includes('forma')) {
      if (normalizedValue.includes('plegable')) {
        return ['Plegable'];
      }

      if (normalizedValue.includes('rect')) {
        return ['Recto'];
      }
    }

    return [value];
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
