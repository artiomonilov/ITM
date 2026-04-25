import mongoose from 'mongoose';

const ResourceRequestSchema = new mongoose.Schema({
  professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  type: {
    type: String,
    enum: ['TOKEN', 'SUBSCRIPTION'],
    required: true,
  },
  quantity: { type: Number, required: true, min: 1 },
  scope: {
    type: String,
    enum: ['COURSE_SETUP', 'EXTRA_STUDENT'],
    default: 'COURSE_SETUP',
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  },
  reason: { type: String, default: '' },
  approvedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.ResourceRequest || mongoose.model('ResourceRequest', ResourceRequestSchema);
