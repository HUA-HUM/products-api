export interface IUpdateJobRepository {
  update(id: number, data: any): Promise<void>;
}
