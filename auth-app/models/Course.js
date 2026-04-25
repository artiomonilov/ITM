import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  materials: [{
    title: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],maxStudents: { type: Number, default: 0 },
  resourceRequirements: {
    tokenPerStudent: { type: Number, default: 0 },
    subscriptionPerStudent: { type: Number, default: 0 },
    tokenTotalRequested: { type: Number, default: 0 },
    subscriptionTotalRequested: { type: Number, default: 0 },
    tokenExtraAllowance: { type: Number, default: 0 },
    subscriptionExtraAllowance: { type: Number, default: 0 },
  }

}, { timestamps: true });

export default mongoose.models.Course || mongoose.model('Course', CourseSchema);
