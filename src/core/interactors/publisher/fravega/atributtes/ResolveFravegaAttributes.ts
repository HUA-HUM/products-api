import { Inject } from '@nestjs/common';
import { IGetFravegaAttributesRepository } from 'src/core/adapters/repositories/marketplace/fravega/GetAtributtes/IGetFravegaAttributesRepository';
import { IOpenAIAttributesExtractor } from 'src/core/adapters/repositories/openAi/IOpenAIAttributesExtractor';

export class ResolveFravegaAttributes {
  constructor(
    @Inject('IGetFravegaAttributesRepository')
    private readonly attributesRepository: IGetFravegaAttributesRepository,

    @Inject('IOpenAIAttributesExtractor')
    private readonly openAI: IOpenAIAttributesExtractor
  ) {}

  async execute(categoryId: string, product: any): Promise<{ id: string; value: any }[] | null> {
    /* ======================================
       1. GET CATEGORY ATTRIBUTES
    ====================================== */
    const categoryAttributes = await this.attributesRepository.getByCategoryId(categoryId);

    if (!categoryAttributes?.length) {
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
    const result: { id: string; value: any }[] = [];

    for (const attr of categoryAttributes) {
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
        value = '-';
      }

      /* ======================================
         VALIDACIÓN
      ====================================== */
      if (attr.required && (!value || value === '-')) {
        return null; // 🚨 skip producto
      }

      result.push({
        id: attr.name,
        value
      });
    }

    return result;
  }

  /* ======================================
     LOCAL EXTRACTOR (simple)
  ====================================== */
  private tryLocal(product: any, attrName: string): any {
    const raw = product?.attributes?.raw || {};

    const map: Record<string, string> = {
      Color: raw.color,
      Marca: raw.marca
    };

    return map[attrName] || null;
  }
}
