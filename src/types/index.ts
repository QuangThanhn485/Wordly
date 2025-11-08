// ===== Common Types =====

export type ApiResponse<T = any> = {
  data: T;
  message?: string;
  success: boolean;
};

export type ApiError = {
  message: string;
  code?: string;
  status?: number;
};

export type PaginationParams = {
  page: number;
  limit: number;
  total?: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// ===== User Types =====
export type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

// ===== Common UI Types =====
export type SelectOption<T = string> = {
  label: string;
  value: T;
  disabled?: boolean;
};

export type TabItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

// ===== Utility Types =====
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

