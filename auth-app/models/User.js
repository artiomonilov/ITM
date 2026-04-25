import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  nume: { type: String, required: true },
  prenume: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Student', 'Profesor', 'Admin', 'Audit'], 
    default: 'Student' 
  },
  isActive: { type: Boolean, default: false }, // Trebuie activat prin email
  activationToken: String,
  activationTokenExpiry: Date,
  resetToken: String,
  resetTokenExpiry: Date,
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
