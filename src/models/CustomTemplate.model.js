const mongoose = require('mongoose');

const customTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      unique: true,
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Email subject line is required'],
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Template body content is required'],
    },
  },
  {
    timestamps: true,
  }
);

const CustomTemplate = mongoose.model('CustomTemplate', customTemplateSchema);

module.exports = CustomTemplate;
