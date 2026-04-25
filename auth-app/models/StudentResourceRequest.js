import mongoose from 'mongoose';

const StudentResourceRequestSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['TOKEN', 'SUBSCRIPTION'],
    required: true,
  },
  quantity: { type: Number, required: true, min: 1 },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['PENDING_PROFESSOR', 'FORWARDED_TO_ADMIN', 'REJECTED_BY_PROFESSOR'],
    default: 'PENDING_PROFESSOR',
  },
  adminRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResourceRequest', default: null },
  forwardedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.StudentResourceRequest || mongoose.model('StudentResourceRequest', StudentResourceRequestSchema);
