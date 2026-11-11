import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri || /replace-with|change-me/i.test(uri)) {
    throw new Error("MONGODB_URI must be configured before the backend can start.");
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
  } catch (error) {
    throw new Error(`MongoDB connection failed (${error.name}). Check MONGODB_URI and database availability.`);
  }

  mongoose.connection.on("error", (error) => {
    console.error(`MongoDB connection error (${error.name}).`);
  });

  console.info("MongoDB connected successfully.");
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
