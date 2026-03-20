import OpenAI from 'openai';
import { IOpenAIAttributesExtractor } from 'src/core/adapters/repositories/openAi/IOpenAIAttributesExtractor';

export class OpenAIAttributesExtractor implements IOpenAIAttributesExtractor {
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not defined');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async extract(params: { description: string; attributes: { name: string }[] }): Promise<Record<string, string>> {
    const { description, attributes } = params;

    const attributesList = attributes.map(a => a.name).join(', ');

    const prompt = `
Extrae los siguientes atributos del texto del producto.

ATRIBUTOS:
${attributesList}

TEXTO:
${description}

Devuelve SOLO JSON válido:
{
  "Color": "",
  "Material": "",
  "Tamaño": ""
}

- Si no encontrás un atributo, devolver "-"
- No inventes datos
`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0
    });

    const rawContent = response.choices[0]?.message?.content || '{}';
    const content = this.extractJson(rawContent);

    try {
      return JSON.parse(content);
    } catch {
      console.error('OpenAI JSON parse error:', rawContent);
      return {};
    }
  }

  private extractJson(content: string): string {
    return content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
}
