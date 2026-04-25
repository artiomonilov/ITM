import mongoose from 'mongoose';
import { collapseWhitespace } from '@/lib/inputSecurity';

const CourseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 3, maxlength: 120, set: collapseWhitespace },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000, set: collapseWhitespace },
  destination: {
    type: String,
    enum: ['STUDENT', 'PROFESSOR'],
    default: 'STUDENT',
    required: true,
  },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  materials: [{
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120, set: collapseWhitespace },
    description: { type: String, trim: true, maxlength: 1000, set: collapseWhitespace },
    fileUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],maxStudents: { type: Number, default: 0, min: 0 },
  resourceRequirements: {
    tokenPerStudent: { type: Number, default: 0, min: 0 },
    subscriptionPerStudent: { type: Number, default: 0, min: 0 },
    tokenTotalRequested: { type: Number, default: 0, min: 0 },
    subscriptionTotalRequested: { type: Number, default: 0, min: 0 },
    tokenExtraAllowance: { type: Number, default: 0, min: 0 },
    subscriptionExtraAllowance: { type: Number, default: 0, min: 0 },
  }
}, {
  timestamps: true,
  strict: 'throw',
});

const existingCourseModel = mongoose.models.Course;

if (existingCourseModel && !existingCourseModel.schema.path('destination')) {
  delete mongoose.models.Course;
}

export default mongoose.models.Course || mongoose.model('Course', CourseSchema);
