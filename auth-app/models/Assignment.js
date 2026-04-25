import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  comment: { type: String }
}, { timestamps: true });

export default mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);
