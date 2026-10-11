import type { Sql, TransactionSql } from "postgres";
export const marketingSpaces: readonly { key: string; title: string; type: string; tag: string; rate: number; capacity: number; description: string }[];
export function seedMarketingSpaces(sql: Sql | TransactionSql, hostId: string, options?: { firstListingId?: string; assetOrigin?: string; remotePhotos?: boolean; prefix?: string }): Promise<string[]>;
