const mongoose = require('mongoose');

/**
 * Agent Profile Schema containing agent-specific details, documents, bank details, commissions, and nominee info.
 */
const agentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    // Personal Details
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    residencyStatus: {
      type: String,
      required: [true, 'Residency / Citizenship is required'],
      enum: {
        values: ['National (Domestic)', 'International'],
        message: 'Residency must be either National (Domestic) or International',
      },
      default: 'National (Domestic)',
    },
    panNumber: {
      type: String,
      required: [true, 'PAN / Tax ID number is required'],
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v) {
          if (this.residencyStatus === 'International') {
            return v && v.trim().length > 0;
          }
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: 'Please provide a valid PAN number',
      },
    },
    aadhaarNumber: {
      type: String,
      required: [true, 'Aadhaar / Passport number is required'],
      trim: true,
      validate: {
        validator: function(v) {
          if (this.residencyStatus === 'International') {
            return v && v.trim().length > 0;
          }
          return /^\d{12}$/.test(v);
        },
        message: 'Please provide a valid 12-digit Aadhaar number',
      },
    },
    // Bank Details
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true,
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC / SWIFT code is required'],
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v) {
          if (this.residencyStatus === 'International') {
            return v && v.trim().length > 0;
          }
          return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
        },
        message: 'Please provide a valid IFSC code',
      },
    },
    // Documents (Stored on Firebase Storage)
    panDocument: {
      type: String,
      required: [true, 'PAN document URL is required'],
    },
    idProofDocument: {
      type: String,
      required: [true, 'ID proof document URL is required'],
    },
    bankProofDocument: {
      type: String,
      required: [true, 'Bank proof document URL is required'],
    },
    nomineeProofDocument: {
      type: String,
      required: [true, 'Nominee proof document URL is required'],
    },
    // Commission Configuration
    oneTimeCommission: {
      type: Number,
      default: 0,
    },
    monthlySlab: {
      type: String,
      default: '',
    },
    specialCommission: {
      type: Number,
      default: 0,
    },
    // Nominee Details
    nomineeName: {
      type: String,
      required: [true, 'Nominee name is required'],
      trim: true,
    },
    nomineeRelation: {
      type: String,
      required: [true, 'Nominee relation is required'],
      trim: true,
    },
    nomineePhone: {
      type: String,
      required: [true, 'Nominee phone number is required'],
      trim: true,
    },
    nomineeEmail: {
      type: String,
      required: [true, 'Nominee email address is required'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid nominee email address',
      ],
    },
    nomineeResidency: {
      type: String,
      required: [true, 'Nominee Residency / Citizenship is required'],
      enum: {
        values: ['National (Domestic)', 'International'],
        message: 'Nominee Residency must be either National (Domestic) or International',
      },
      default: 'National (Domestic)',
    },
    // Status & Portal Password
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'suspended', 'blocked', 'hold'],
        message: 'Status must be active, inactive, suspended, blocked, or hold',
      },
      default: 'active',
    },
    portalPassword: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

// Optimize query performance for agent listing and profile searches
agentProfileSchema.index({ status: 1 });

const AgentProfile = mongoose.model('AgentProfile', agentProfileSchema);

module.exports = AgentProfile;
