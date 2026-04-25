import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI; // De înlocuit în .env

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  
  if (!MONGODB_URI) {
    console.warn("Lipsește MONGODB_URI");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Conectat la Baza de Date MongoDB!");
  } catch (error) {
    console.error("Eroare la conectarea MongoDB:", error);
  }
};
