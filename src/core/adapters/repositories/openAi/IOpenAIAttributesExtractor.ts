export interface IOpenAIAttributesExtractor {
  extract(params: { description: string; attributes: { name: string }[] }): Promise<Record<string, string>>;
}
