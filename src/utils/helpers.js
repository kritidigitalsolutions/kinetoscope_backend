const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');

/**
 * Signs a JWT with the user ID and role payload.
 * @param {string} userId - Mongo user document identifier
 * @param {string} role - Access level role (e.g. super-admin, client, agent)
 * @returns {string} Signed JWT Token
 */
const signToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'kfpl_super_secure_jwt_secret_key_2026',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );
};

/**
 * Generate a JWT auth token (Alias/alternative structure)
 * @param {string} userId - User identifier
 * @param {string} role - User role
 * @returns {string} Signed JWT Token
 */
const generateToken = (userId, role) => {
  return signToken(userId, role);
};

/**
 * Configures cookie options for sending token securely over HTTP.
 * @returns {object} Express cookie options configurations
 */
const getCookieOptions = () => {
  const cookieOptions = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE || '30', 10) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,   // Prevents client-side scripts from reading the cookie (mitigates XSS)
    secure: true,     // Always serve cookie over HTTPS only
    sameSite: 'none', // Enables cross-site requests (necessary for separate frontend-backend hosting)
  };

  return cookieOptions;
};

/**
 * Hash a plain text password using bcryptjs
 * @param {string} password - Raw password string
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Verify a plain text password against a hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {Promise<boolean>} Match result
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Format date utility using dayjs
 * @param {Date|string} date - Date representation
 * @param {string} format - Target format pattern
 * @returns {string} Formatted string
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(date).format(format);
};

module.exports = {
  signToken,
  generateToken,
  getCookieOptions,
  hashPassword,
  comparePassword,
  formatDate,
};
