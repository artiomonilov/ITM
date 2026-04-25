import mongoose from 'mongoose';

const ServiceCredentialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceName: {
    type: String,
    enum: ['AI', 'VPS'],
    required: true,
  },
  username: { type: String, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

ServiceCredentialSchema.index({ userId: 1, serviceName: 1 }, { unique: true });

export default mongoose.models.ServiceCredential || mongoose.model('ServiceCredential', ServiceCredentialSchema);
