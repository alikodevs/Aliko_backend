export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: any): Promise<T[]>;
  create(data: any): Promise<T>;
  update(id: string, data: any): Promise<T>;
  delete(id: string): Promise<boolean>;
}
