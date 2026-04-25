import mongoose from 'mongoose';

const CourseActivityLogSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
  activityTitle: { type: String, required: true },
  mode: {
    type: String,
    enum: ['AI', 'VPS_PLACEHOLDER', 'MANUAL_TOKEN', 'SUBSCRIPTION_VALIDATION'],
    required: true,
  },
  prompt: { type: String, default: '' },
  response: { type: String, default: '' },
  tokenConsumed: { type: Number, default: 0, min: 0 },
  subscriptionConsumed: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export default mongoose.models.CourseActivityLog || mongoose.model('CourseActivityLog', CourseActivityLogSchema);
