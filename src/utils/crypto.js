const crypto = require('crypto');

// Retrieve encryption key from env; fallback to a secure key derivation base if not set
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-super-secret-key-32-bytes-long-change-this!';

// Derive a static 32-byte (256-bit) key from the configuration source using SHA-256
const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypts cleartext using AES-256-GCM.
 * Output format is `iv:authTag:encryptedHex`
 * @param {string} text
 * @returns {string} Encrypted format or original value if not valid input
 */
function encrypt(text) {
  if (text === null || text === undefined) return text;
  
  const textStr = String(text);
  if (textStr.trim() === '') return text;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(textStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('[Encryption Error]:', err.message);
    return text;
  }
}

/**
 * Decrypts ciphertext in `iv:authTag:encryptedHex` format.
 * Returns the original value as-is if decryption fails or format is invalid.
 * @param {string} cipherText
 * @returns {string} Decrypted string or original value
 */
function decrypt(cipherText) {
  if (cipherText === null || cipherText === undefined) return cipherText;

  const cipherTextStr = String(cipherText);
  if (!cipherTextStr.includes(':')) {
    // If not matching encrypted format, return as-is (backward compatibility)
    return cipherText;
  }

  try {
    const parts = cipherTextStr.split(':');
    if (parts.length !== 3) {
      return cipherText;
    }

    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    // Graceful fallback for unencrypted existing records
    return cipherText;
  }
}

module.exports = {
  encrypt,
  decrypt,
};
