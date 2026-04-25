import mongoose from 'mongoose';

const ResourceUsageSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  profId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
  activityTitle: { type: String, default: '' },
  resourceType: {
    type: String,
    enum: ['TOKEN', 'SUBSCRIPTION'],
    required: true,
  },
  quantity: { type: Number, default: 1 },
  tokenCostPerUnit: { type: Number, default: 0 },
  totalTokensUsed: { type: Number, default: 0 },
  subscriptionCountUsed: { type: Number, default: 0 },
  details: { type: String, default: '' },
  validated: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.ResourceUsage || mongoose.model('ResourceUsage', ResourceUsageSchema);
