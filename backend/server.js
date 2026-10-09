import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/userroutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
let connectionPromise;

async function connectToDatabase() {
  if (!mongoUri) {
    throw new Error("Missing MongoDB connection string. Set MONGODB_URI in the Vercel project environment.");
  }
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }
  await connectionPromise;
}

app.use(async (_req, _res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/users", userRoutes);

app.use((error, _req, res, _next) => {
  console.error("MongoDB connection error:", error);
  res.status(500).json({ error: "Could not connect to the database." });
});

if (process.env.VERCEL !== "1") {
  connectToDatabase()
    .then(() => {
      console.log("MongoDB connected");
      app.listen(process.env.PORT || 5000, () =>
        console.log(`Server running on port ${process.env.PORT || 5000}`),
      );
    })
    .catch((error) => {
      console.error("MongoDB connection error:", error);
      process.exitCode = 1;
    });
}

export default app;
