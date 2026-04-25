import mongoose from 'mongoose';
import { collapseWhitespace } from '@/lib/inputSecurity';

const MaterialSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120, set: collapseWhitespace },
  description: { type: String, trim: true, maxlength: 1000, set: collapseWhitespace },
  fileUrl: { type: String, required: true, trim: true, maxlength: 2048 },
  fileName: { type: String, required: true, trim: true, maxlength: 255 },
  uploadedAt: { type: Date, default: Date.now },
  comment: { type: String, trim: true, maxlength: 1000, set: collapseWhitespace }
}, {
  timestamps: true,
  strict: 'throw',
});

export default mongoose.models.Material || mongoose.model('Material', MaterialSchema);
