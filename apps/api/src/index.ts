import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import "dotenv/config";
import { scanRoutes } from "./routes/scan";
import { transactionRoutes } from "./routes/transactions";

const app = Fastify({ logger: false });

app.register(cors, { origin: "http://localhost:3000" });
app.register(jwt, { secret: process.env.NEXTAUTH_SECRET! });

app.get("/health", () => ({ status: "ok", app: "FinZen API" }));
app.register(scanRoutes);
app.register(transactionRoutes);

app.listen({ port: 4000 }, (err) => {
  if (err) process.exit(1);
  console.log("FinZen API corriendo en http://localhost:4000");
});