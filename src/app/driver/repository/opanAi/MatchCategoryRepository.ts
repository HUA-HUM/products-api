import OpenAI from 'openai';
import { IMatchFravegaCategoryRepository } from 'src/core/adapters/repositories/openAi/IMatchFravegaCategoryRepository';
import { FravegaCategoryLeaf } from 'src/core/adapters/repositories/marketplace/fravega/GetCategoriesTree/IGetFravegaCategoriesTreeRepository';

export class MatchCategoryRepository implements IMatchFravegaCategoryRepository {
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not defined');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async match(params: {
    title: string;
    description?: string;
    categoryPath?: string;
    candidates: FravegaCategoryLeaf[];
  }): Promise<string | null> {
    const { title, description = '', categoryPath = '', candidates } = params;

    if (!candidates.length) {
      return null;
    }

    const shortlisted = this.buildShortlist(title, categoryPath, candidates);
    const options = shortlisted.map(category => ({
      id: category.id,
      name: category.name,
      attributes: (category.attributes ?? []).map(attribute => attribute.name).filter(Boolean).slice(0, 8)
    }));

    const prompt = `
Elegí la mejor categoria HIJA de Fravega para este producto.

PRODUCTO:
- titulo: ${title}
- categoryPath: ${categoryPath || '-'}
- descripcion: ${description.slice(0, 1200) || '-'}

CANDIDATAS:
${JSON.stringify(options, null, 2)}

Reglas:
- Elegí SOLO una categoria final/especifica
- No elijas categorias padre o demasiado generales
- Devolvé SOLO JSON valido con este formato:
{"categoryId":"..."}
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

    const rawContent = response.choices[0]?.message?.content ?? '{}';
    const content = this.extractJson(rawContent);

    try {
      const parsed = JSON.parse(content) as { categoryId?: string };
      const selected = shortlisted.find(category => category.id === parsed.categoryId);
      return selected?.id ?? shortlisted[0]?.id ?? null;
    } catch {
      console.error('OpenAI category JSON parse error:', rawContent);
      return shortlisted[0]?.id ?? null;
    }
  }

  private buildShortlist(title: string, categoryPath: string, candidates: FravegaCategoryLeaf[]): FravegaCategoryLeaf[] {
    const productText = this.tokenize(`${title} ${categoryPath}`);

    const ranked = candidates
      .map(category => ({
        category,
        score: this.scoreCategory(productText, category)
      }))
      .sort((a, b) => b.score - a.score);

    const positiveMatches = ranked.filter(item => item.score > 0).slice(0, 30).map(item => item.category);

    if (positiveMatches.length > 0) {
      return positiveMatches;
    }

    return ranked.slice(0, 20).map(item => item.category);
  }

  private scoreCategory(productTokens: string[], category: FravegaCategoryLeaf): number {
    const categoryTokens = this.tokenize(
      `${category.name} ${(category.attributes ?? []).map(attribute => attribute.name).join(' ')}`
    );

    if (!categoryTokens.length) {
      return 0;
    }

    return categoryTokens.reduce((score, token) => {
      return score + (productTokens.includes(token) ? 1 : 0);
    }, 0);
  }

  private tokenize(text: string): string[] {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  private extractJson(content: string): string {
    return content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
}
