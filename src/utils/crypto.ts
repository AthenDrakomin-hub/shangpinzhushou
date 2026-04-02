import crypto from 'crypto';

const algorithm = 'aes-256-cbc';

// 缓存加密密钥
let cachedKey: Buffer | null = null;

/**
 * 获取加密密钥（32字节）
 */
function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }
  
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    // 如果没有设置 ENCRYPTION_KEY，生成一个基于 PGDATABASE_URL 的固定密钥
    // 这样至少服务可以启动，但建议在生产环境设置 ENCRYPTION_KEY
    const fallbackKey = process.env.PGDATABASE_URL || 'default-encryption-key-for-development';
    console.warn('ENCRYPTION_KEY not set, using fallback key derivation. This is not recommended for production!');
    cachedKey = crypto.createHash('sha256').update(fallbackKey).digest();
    return cachedKey;
  }
  
  // 如果是hex格式，直接转换为Buffer
  if (key.length === 64) {
    cachedKey = Buffer.from(key, 'hex');
  } else {
    // 否则使用sha256派生密钥
    cachedKey = crypto.createHash('sha256').update(key).digest();
  }
  
  return cachedKey;
}

/**
 * 加密文本
 * @param text 要加密的明文
 * @returns 加密后的字符串（格式：iv:encryptedData）
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * 解密文本
 * @param encryptedText 加密的字符串（格式：iv:encryptedData）
 * @returns 解密后的明文
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 生成随机密钥（用于首次配置）
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 哈希密码（用于敏感信息存储）
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
