import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import "dotenv/config";
import { scanRoutes } from "./routes/scan";
import { transactionRoutes } from "./routes/transactions";

const app = Fastify({ logger: false });

app.register(cors, {
  origin: [
    "http://localhost:3000",
    "https://project-q91ih.vercel.app",
    process.env.FRONTEND_URL || "",
  ].filter(Boolean),
});

app.register(jwt, { secret: process.env.NEXTAUTH_SECRET! });

app.get("/health", () => ({ status: "ok", app: "FinZen API" }));
app.register(scanRoutes);
app.register(transactionRoutes);

const port = parseInt(process.env.PORT || "4000");
app.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) process.exit(1);
  console.log(`FinZen API corriendo en puerto ${port}`);
});
