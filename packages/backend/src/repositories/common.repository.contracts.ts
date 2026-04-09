export type { EntityId } from "../domain/shared.types";

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
}
