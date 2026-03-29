import { Inject, Injectable } from '@nestjs/common';
import {
  FravegaCategoryLeaf,
  IGetFravegaCategoriesTreeRepository
} from 'src/core/adapters/repositories/marketplace/fravega/GetCategoriesTree/IGetFravegaCategoriesTreeRepository';
import { IMatchFravegaCategoryRepository } from 'src/core/adapters/repositories/openAi/IMatchFravegaCategoryRepository';

@Injectable()
export class ResolveFravegaCategory {
  constructor(
    @Inject('IGetFravegaCategoriesTreeRepository')
    private readonly categoriesRepository: IGetFravegaCategoriesTreeRepository,

    @Inject('IMatchFravegaCategoryRepository')
    private readonly matchRepository: IMatchFravegaCategoryRepository
  ) {}

  async execute(product: { title?: string; description?: string; categoryPath?: string }): Promise<string | null> {
    const categoryIds = await this.executeCandidates(product, 1);
    return categoryIds[0] ?? null;
  }

  async executeCandidates(
    product: { title?: string; description?: string; categoryPath?: string },
    limit = 5
  ): Promise<string[]> {
    if (!product.title) {
      return [];
    }

    try {
      const categories = await this.categoriesRepository.getLeafCategories();
      const shortlisted = this.selectCandidates(categories, product.categoryPath);
      const selectedId = await this.matchRepository.match({
        title: product.title,
        description: product.description,
        categoryPath: product.categoryPath,
        candidates: shortlisted
      });

      const orderedIds = [
        ...(selectedId ? [selectedId] : []),
        ...shortlisted.map(category => category.id).filter(id => id !== selectedId)
      ];

      return orderedIds.slice(0, limit);
    } catch {
      return [];
    }
  }

  private selectCandidates(categories: FravegaCategoryLeaf[], categoryPath?: string): FravegaCategoryLeaf[] {
    if (!categoryPath) {
      return categories;
    }

    const pathTokens = this.tokenize(categoryPath);
    const ranked = categories
      .map(category => ({
        category,
        score: this.tokenize(category.name).reduce((score, token) => {
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
