import OpenAI from 'openai';
import { IMatchOnCityBrandRepository } from 'src/core/adapters/repositories/openAi/IMatchOnCityBrandRepository';
import { OnCityBrand } from 'src/core/adapters/repositories/marketplace/oncity/GetBrand/IGetOnCityBrandsRepository';

export class MatchOnCityBrandRepository implements IMatchOnCityBrandRepository {
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not defined');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async match(params: { brand: string; candidates: OnCityBrand[] }): Promise<string | null> {
    const { brand, candidates } = params;

    if (!brand?.trim() || !candidates.length) {
      return null;
    }

    const shortlisted = this.buildShortlist(brand, candidates);
    const options = shortlisted.map(item => ({
      id: String(item.id),
      name: item.name
    }));

    const prompt = `
Elegí la mejor marca de OnCity para esta marca de producto.

MARCA DEL PRODUCTO:
- brand: ${brand}

MARCAS CANDIDATAS:
${JSON.stringify(options, null, 2)}

Reglas:
- Elegí SOLO una marca
- Priorizá equivalencia exacta o casi exacta
- Si hay diferencias de mayúsculas, acentos o signos, consideralas equivalentes
- Devolvé SOLO JSON valido con este formato:
{"brandId":"..."}
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
      const parsed = JSON.parse(content) as { brandId?: string };
      const selected = shortlisted.find(item => String(item.id) === parsed.brandId);
      return selected ? String(selected.id) : String(shortlisted[0]?.id ?? '');
    } catch {
      console.error('OpenAI OnCity brand JSON parse error:', rawContent);
      return shortlisted[0] ? String(shortlisted[0].id) : null;
    }
  }

  private buildShortlist(brand: string, candidates: OnCityBrand[]): OnCityBrand[] {
    const normalizedBrand = this.normalize(brand);

    const exact = candidates.find(candidate => this.normalize(candidate.name) === normalizedBrand);
    if (exact) {
      return [exact];
    }

    const ranked = candidates
      .map(candidate => ({
        candidate,
        score: this.scoreBrand(brand, candidate.name)
      }))
      .sort((a, b) => b.score - a.score);

    const positiveMatches = ranked.filter(item => item.score > 0).slice(0, 20).map(item => item.candidate);
    if (positiveMatches.length > 0) {
      return positiveMatches;
    }

    return ranked.slice(0, 10).map(item => item.candidate);
  }

  private scoreBrand(source: string, candidate: string): number {
    const sourceTokens = this.tokenize(source);
    const candidateTokens = this.tokenize(candidate);

    return candidateTokens.reduce((score, token) => {
      return score + (sourceTokens.includes(token) ? 1 : 0);
    }, 0);
  }

  private tokenize(text: string): string[] {
    return this.normalize(text)
      .split(/\s+/)
      .filter(token => token.length > 1);
  }

  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();
  }

  private extractJson(content: string): string {
    return content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
}
