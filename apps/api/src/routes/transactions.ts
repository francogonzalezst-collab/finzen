import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function transactionRoutes(app: FastifyInstance) {
  app.post("/api/transactions/save", async (req, reply) => {
    const { transactions, userId } = req.body as any;
    if (!transactions || !userId) return reply.status(400).send({ error: "Faltan datos" });
    try {
      const saved = [];
      for (const tx of transactions) {
        const record = await prisma.transaction.create({
          data: {
            userId,
            source: "gmail",
            type: tx.type || "expense",
            amount: tx.type === "income" ? tx.amount : -Math.abs(tx.amount),
            currency: "CLP",
            merchant: tx.merchant || "Desconocido",
            date: tx.date ? new Date(tx.date) : new Date(),
          },
        });
        saved.push(record);
      }
      return reply.send({ ok: true, saved: saved.length });
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });

  app.get("/api/transactions/:userId", async (req, reply) => {
    const { userId } = req.params as any;
    try {
      const txs = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 50,
      });
      return reply.send({ ok: true, transactions: txs });
    } catch (err) {
      return reply.status(500).send({ error: err.message });
    }
  });
}