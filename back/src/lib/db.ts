import mongoose from "mongoose"

let connectPromise: Promise<typeof mongoose> | null = null
let listenersAttached = false

function setupConnectionListeners() {
  if (listenersAttached) return
  listenersAttached = true

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ [MongoDB] Conexión perdida con la base de datos.")
  })
  mongoose.connection.on("reconnected", () => {
    console.log("🍃 [MongoDB] Reconectado exitosamente a la base de datos.")
  })
  mongoose.connection.on("error", (err) => {
    console.error("❌ [MongoDB] Error en conexión:", err)
  })
}

export async function connectDB(): Promise<typeof mongoose> {
  setupConnectionListeners()

  // 1: Connected
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  // 2: Connecting - await ongoing connection promise
  if (mongoose.connection.readyState === 2 && connectPromise) {
    return connectPromise
  }

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/noty_db"

  connectPromise = (async () => {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      })
      console.log("🍃 MongoDB conectada exitosamente")
      return conn
    } catch (error) {
      console.error("❌ Error conectando a MongoDB:", error)
      throw error
    } finally {
      connectPromise = null
    }
  })()

  return connectPromise
}
