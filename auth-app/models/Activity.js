import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  taskPrompt: { type: String, required: true, trim: true },
  tokenCost: { type: Number, required: true, min: 0, default: 0 },
  subscriptionCost: { type: Number, required: true, min: 0, default: 0 },
  executionType: {
    type: String,
    enum: ['AI', 'VPS_PLACEHOLDER'],
    required: true,
    default: 'AI',
  },
}, { timestamps: true });

const existingActivityModel = mongoose.models.Activity;

if (
  existingActivityModel
  && (!existingActivityModel.schema.path('subscriptionCost') || !existingActivityModel.schema.path('executionType'))
) {
  delete mongoose.models.Activity;
}

export default mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
