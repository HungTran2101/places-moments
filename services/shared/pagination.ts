export interface PaginationMetadata {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Danh sách phân trang dùng chung cấu trúc để frontend không phải xử lý metadata riêng cho từng API.
export interface PaginatedResponse<T> {
  items: T[];
  metadata: PaginationMetadata;
}
