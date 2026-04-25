import mongoose from 'mongoose';
import { EMAIL_REGEX, NAME_REGEX, collapseWhitespace } from '@/lib/inputSecurity';

const UserSchema = new mongoose.Schema({
  nume: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
    match: NAME_REGEX,
    set: collapseWhitespace,
  },
  prenume: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
    match: NAME_REGEX,
    set: collapseWhitespace,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 120,
    match: EMAIL_REGEX,
    set: (value) => typeof value === 'string' ? value.trim().toLowerCase() : value,
  },
  password: {
    type: String,
    required: true,
    minlength: 60,
    maxlength: 255,
    select: false,
  },
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
}, {
  timestamps: true,
  strict: 'throw',
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
