export interface RateLimitOptions {
  maxRequests?: number;
  windowSeconds?: number;
  keyPrefix?: string;
}

export interface RateLimitStore {
  count: number;
  resetTime: number;
}
