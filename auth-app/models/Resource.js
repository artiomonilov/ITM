import mongoose from 'mongoose';

const ResourceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  profId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  type: {
    type: String,
    enum: ['TOKEN', 'SUBSCRIPTION'],
    required: true,
  },
  quantity: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['ALLOCATED', 'CONSUMED'],
    default: 'ALLOCATED',
  },
  allocationScope: {
    type: String,
    enum: ['COURSE', 'EXTRA'],
    default: 'COURSE',
  },
  credentials: {
    username: String,
    password: String,
    ip: String,
  },
}, { timestamps: true });

export default mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);
