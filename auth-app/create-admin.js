const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI;

const UserSchema = new mongoose.Schema({
  nume: { type: String, required: true },
  prenume: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Student', 'Profesor', 'Admin', 'Audit'], default: 'Student' },
  isActive: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const createAdmin = async () => {
  try {
    if (!mongoUri) {
      console.error('EROARE: MONGODB_URI nu este definit in fisierele .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Conectat la MongoDB');

    const email = 'admin@admin.com';
    const password = '12345678aA@';
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'Admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();

      console.log('Contul admin@admin.com exista deja. Parola a fost actualizata.');
      console.log('Email: admin@admin.com');
      console.log('Parola: 12345678aA@');
      return;
    }

    const newAdmin = new User({
      nume: 'Super',
      prenume: 'Admin',
      email,
      password: hashedPassword,
      role: 'Admin',
      isActive: true,
    });

    await newAdmin.save();
    console.log('Utilizatorul ADMIN a fost creat cu succes.');
    console.log('Email: admin@admin.com');
    console.log('Parola: 12345678aA@');
  } catch (error) {
    console.error('Eroare:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
