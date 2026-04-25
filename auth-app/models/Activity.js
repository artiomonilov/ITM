import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  taskPrompt: { type: String, required: true, trim: true },
  tokenCost: { type: Number, required: true, min: 0 },
}, { timestamps: true });

export default mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
