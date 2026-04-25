import mongoose from 'mongoose';

const ResourceInventorySchema = new mongoose.Schema({
  totalTokens: { type: Number, default: 0 },
  totalSubscriptions: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.ResourceInventory || mongoose.model('ResourceInventory', ResourceInventorySchema);
