export class PaginationDto {
  page?: number = 1;
  limit?: number = 10;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
