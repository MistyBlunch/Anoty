import mongoose from "mongoose"

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return
  }

  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/noty_db"
    await mongoose.connect(mongoUri)
    console.log("🍃 MongoDB conectada exitosamente")
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error)
  }
}
