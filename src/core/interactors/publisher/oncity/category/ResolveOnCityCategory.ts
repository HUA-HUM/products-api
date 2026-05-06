import { Inject, Injectable } from '@nestjs/common';
import {
  IGetOnCityCategoriesTreeRepository,
  OnCityCategoryLeaf
} from 'src/core/adapters/repositories/marketplace/oncity/GetCategoriesTree/IGetOnCityCategoriesTreeRepository';
import { IMatchOnCityCategoryRepository } from 'src/core/adapters/repositories/openAi/IMatchOnCityCategoryRepository';

@Injectable()
export class ResolveOnCityCategory {
  constructor(
    @Inject('IGetOnCityCategoriesTreeRepository')
    private readonly repository: IGetOnCityCategoriesTreeRepository,

    @Inject('IMatchOnCityCategoryRepository')
    private readonly matchRepository: IMatchOnCityCategoryRepository
  ) {}

  async execute(product: { title?: string; description?: string; categoryPath?: string }): Promise<string | null> {
    const candidates = await this.executeCandidates(product, 1);
    return candidates[0] ?? null;
  }

  async executeCandidates(
    product: { title?: string; description?: string; categoryPath?: string },
    limit = 5
  ): Promise<string[]> {
    if (!product.title || !product.categoryPath) {
      return [];
    }

    const categories = await this.repository.getLeafCategories();
    if (!categories.length) {
      return [];
    }

    const shortlisted = this.selectCandidates(categories, product.categoryPath);
    const selectedId = await this.matchRepository.match({
      title: product.title,
      description: product.description,
      categoryPath: product.categoryPath,
      candidates: shortlisted
    });

    const orderedIds = [
      ...(selectedId ? [selectedId] : []),
      ...shortlisted.map(category => String(category.id)).filter(id => id !== selectedId)
    ];

    return orderedIds.slice(0, limit);
  }

  private selectCandidates(categories: OnCityCategoryLeaf[], categoryPath?: string): OnCityCategoryLeaf[] {
    if (!categoryPath) {
      return categories;
    }

    const pathTokens = this.tokenize(categoryPath);
    const ranked = categories
      .map(category => ({
        category,
        score: this.tokenize(category.path.join(' ')).reduce((score, token) => {
          return score + (pathTokens.includes(token) ? 1 : 0);
        }, 0)
      }))
      .sort((a, b) => b.score - a.score);

    const filtered = ranked.filter(item => item.score > 0).slice(0, 80).map(item => item.category);

    return filtered.length ? filtered : categories;
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
}
