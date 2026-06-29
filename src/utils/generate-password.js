/**
 * Generate a secure random temporary password (min 12 chars with high entropy).
 * Ensures at least one lowercase, one uppercase, one digit, and one special character.
 * @returns {string} A random temporary password string
 */
const generateTempPassword = () => {
  const length = 12;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
  const allChars = lowercase + uppercase + digits + special;

  let password = '';
  // Ensure at least one of each character category is included
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

module.exports = { generateTempPassword };
