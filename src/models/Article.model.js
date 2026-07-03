const mongoose = require('mongoose');

/**
 * Article Schema representing news and media articles/blogs.
 */
const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
    },
    excerpt: {
      type: String,
      trim: true,
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Article content is required'],
    },
    publishDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['Draft', 'Published'],
        message: 'Status must be either Draft or Published',
      },
      default: 'Draft',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
    },
    specialQuote: {
      type: String,
      trim: true,
      default: '',
    },
    quoteAuthorRole: {
      type: String,
      trim: true,
      default: '',
    },
    advisoryNotice: {
      type: String,
      trim: true,
      default: '',
    },
    featuredImage: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator User ID is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup
articleSchema.index({ status: 1 });
articleSchema.index({ category: 1 });
articleSchema.index({ publishDate: -1 });

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
