const mongoose = require('mongoose');

/**
 * ClientPerk Schema representing assignments of perks to clients.
 */
const clientPerkSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Client ID is required'],
    },
    perkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Perk',
      required: [true, 'Perk ID is required'],
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
clientPerkSchema.index({ clientId: 1 });
// Unique compound index to prevent duplicate assignment of the same perk to the same client
clientPerkSchema.index({ clientId: 1, perkId: 1 }, { unique: true });

const ClientPerk = mongoose.model('ClientPerk', clientPerkSchema);

module.exports = ClientPerk;
