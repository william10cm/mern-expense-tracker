import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import recurringRoutes from "./routes/recurringRoutes.js";




dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use("/api/transactions", transactionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/recurring", recurringRoutes);




app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Expense Tracker API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);

const PORT = process.env.PORT || 5000;

connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
});
