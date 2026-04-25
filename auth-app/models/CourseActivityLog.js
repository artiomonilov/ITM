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
  responseType: {
    type: String,
    enum: ['text', 'code', 'image'],
    default: 'text',
  },
  responseContentType: { type: String, default: 'text/plain; charset=utf-8' },
  tokenConsumed: { type: Number, default: 0, min: 0 },
  subscriptionConsumed: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

const existingCourseActivityLogModel = mongoose.models.CourseActivityLog;

if (
  existingCourseActivityLogModel
  && (!existingCourseActivityLogModel.schema.path('responseType') || !existingCourseActivityLogModel.schema.path('responseContentType'))
) {
  delete mongoose.models.CourseActivityLog;
}

export default mongoose.models.CourseActivityLog || mongoose.model('CourseActivityLog', CourseActivityLogSchema);
