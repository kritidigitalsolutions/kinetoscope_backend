const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect middleware — verifies JWT token and attaches the authenticated user to req.user.
 * Supports token extraction from:
 *   1. Authorization: Bearer <token> header
 *   2. jwt cookie
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1) Extract token from Authorization header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // 2) Verify token validity and decode payload
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'kfpl_super_secure_jwt_secret_key_2026');
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid authentication token. Please log in again.', 401));
  }

  // 3) Verify user still exists in the database
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4) Verify account is still active
  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 403));
  }

  // 5) Attach authenticated user to request object
  req.user = currentUser;
  next();
});

/**
 * Restrict access to specific user roles.
 * Usage: restrictTo('super-admin', 'agent')
 * @param {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
