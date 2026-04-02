import { Pool } from 'pg';

// PostgreSQL 连接池单例
let dbUrl = process.env.PGDATABASE_URL || '';
if (dbUrl && !dbUrl.includes('uselibpqcompat')) {
  dbUrl += dbUrl.includes('?') ? '&uselibpqcompat=true' : '?uselibpqcompat=true';
}

export const db = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

/**
 * 便捷的 query 函数（直接导入使用）
 */
export async function query(text: string, params?: any[]) {
  const result = await db.query(text, params);
  return result;
}

export {}; // 确保作为模块导出
