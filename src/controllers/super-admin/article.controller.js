const Article = require('../../models/Article.model');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../../services/cloudinary.service');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Create a new Article (Super Admin only)
 * POST /api/super-admin/articles
 */
const createArticle = asyncHandler(async (req, res, next) => {
  const {
    title,
    excerpt,
    content,
    publishDate,
    status,
    category,
    author,
    specialQuote,
    quoteAuthorRole,
    advisoryNotice,
  } = req.body;

  let featuredImageUrl = '';
  if (req.file) {
    try {
      console.log('[Article Controller] Uploading featured image to Cloudinary...');
      featuredImageUrl = await uploadBufferToCloudinary(req.file.buffer, 'kinetoscope/articles');
    } catch (uploadError) {
      return next(new AppError(`Featured image upload failed: ${uploadError.message}`, 500));
    }
  }

  const article = await Article.create({
    title,
    excerpt: excerpt || '',
    content,
    publishDate: publishDate ? new Date(publishDate) : undefined,
    status: status || 'Draft',
    category,
    author,
    specialQuote: specialQuote || '',
    quoteAuthorRole: quoteAuthorRole || '',
    advisoryNotice: advisoryNotice || '',
    featuredImage: featuredImageUrl,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Article created successfully',
    data: article,
  });
});

/**
 * Get all Articles (Supports Search, Filters, and Pagination)
 * GET /api/super-admin/articles
 */
const getAllArticles = asyncHandler(async (req, res, next) => {
  const { search, category, status, page = 1, limit = 10 } = req.query;

  const query = {};

  // 1) Search filter
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } },
    ];
  }

  // 2) Category and Status filters
  if (category) {
    query.category = category;
  }
  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  // 3) Run queries in parallel
  const [articles, total] = await Promise.all([
    Article.find(query)
      .populate('createdBy', 'name email')
      .sort({ publishDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Article.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: articles.length,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
    data: {
      articles,
    },
  });
});

/**
 * Get a single Article by ID
 * GET /api/super-admin/articles/:id
 */
const getArticleById = asyncHandler(async (req, res, next) => {
  const article = await Article.findById(req.params.id).populate('createdBy', 'name email');
  if (!article) {
    return next(new AppError('Article not found', 404));
  }

  res.status(200).json({
    success: true,
    data: article,
  });
});

/**
 * Update an existing Article (Super Admin only)
 * PATCH /api/super-admin/articles/:id
 */
const updateArticle = asyncHandler(async (req, res, next) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    return next(new AppError('Article not found', 404));
  }

  const updates = {};
  const allowedFields = [
    'title',
    'excerpt',
    'content',
    'publishDate',
    'status',
    'category',
    'author',
    'specialQuote',
    'quoteAuthorRole',
    'advisoryNotice',
  ];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Handle date formatting if updating date
  if (updates.publishDate) {
    updates.publishDate = new Date(updates.publishDate);
  }

  // Handle file upload replacement
  if (req.file) {
    // Delete old image if it exists
    if (article.featuredImage) {
      try {
        console.log('[Article Controller] Deleting old featured image from Cloudinary:', article.featuredImage);
        await deleteFromCloudinary(article.featuredImage);
      } catch (err) {
        console.error('[Article Controller Cleanup] Failed to delete old featured image:', err.message);
      }
    }

    // Upload new image
    try {
      console.log('[Article Controller] Uploading new featured image to Cloudinary...');
      updates.featuredImage = await uploadBufferToCloudinary(req.file.buffer, 'kinetoscope/articles');
    } catch (uploadError) {
      return next(new AppError(`Featured image upload failed: ${uploadError.message}`, 500));
    }
  }

  const updatedArticle = await Article.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Article updated successfully',
    data: updatedArticle,
  });
});

/**
 * Delete an Article (Super Admin only)
 * DELETE /api/super-admin/articles/:id
 */
const deleteArticle = asyncHandler(async (req, res, next) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    return next(new AppError('Article not found', 404));
  }

  // Delete associated featured image from Cloudinary
  if (article.featuredImage) {
    try {
      console.log('[Article Controller] Deleting featured image from Cloudinary:', article.featuredImage);
      await deleteFromCloudinary(article.featuredImage);
    } catch (err) {
      console.error('[Article Controller Cleanup] Failed to delete featured image on deletion:', err.message);
    }
  }

  await Article.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Article deleted successfully',
  });
});

/**
 * Get all Published Articles (Client/Agent facing)
 * GET /api/client/articles or GET /api/agent/articles
 */
const getPublishedArticles = asyncHandler(async (req, res, next) => {
  const { search, category, page = 1, limit = 10 } = req.query;

  const query = { status: 'Published' };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } },
    ];
  }

  if (category) {
    query.category = category;
  }

  const skip = (page - 1) * limit;

  const [articles, total] = await Promise.all([
    Article.find(query)
      .populate('createdBy', 'name email')
      .sort({ publishDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Article.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: articles.length,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
    data: {
      articles,
      news: articles,
    },
  });
});

/**
 * Get a single Published Article by ID (Client/Agent facing)
 */
const getPublishedArticleById = asyncHandler(async (req, res, next) => {
  const article = await Article.findOne({ _id: req.params.id, status: 'Published' }).populate('createdBy', 'name email');
  if (!article) {
    return next(new AppError('Article not found', 404));
  }

  res.status(200).json({
    success: true,
    data: article,
  });
});

module.exports = {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  getPublishedArticles,
  getPublishedArticleById,
};
