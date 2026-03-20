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
    if (!product.title) {
      return null;
    }

    try {
      const categories = await this.categoriesRepository.getLeafCategories();
      const candidates = this.selectCandidates(categories, product.categoryPath);

      return this.matchRepository.match({
        title: product.title,
        description: product.description,
        categoryPath: product.categoryPath,
        candidates
      });
    } catch {
      return null;
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
