import { FastifyInstance } from "fastify";
import { openai } from "../lib/openai";

export async function scanRoutes(app: FastifyInstance) {
  app.post("/api/parse", async (req, reply) => {
    const { subject, from, snippet } = req.body as any;
    if (!snippet) return reply.send({ transaction: null });

    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Extrae transacciones desde correos bancarios chilenos. Responde SOLO con JSON válido sin markdown.
Schema: {"type":"income|expense|bill","amount":number,"currency":"CLP","merchant":"string","date":"YYYY-MM-DD","category":"Alimentación|Transporte|Combustible|Servicios|Entretenimiento|Restaurantes|Ingresos|Otros","is_bill":boolean}
Si no hay transacción responde: null`,
          },
          { role: "user", content: `Asunto: ${subject}\nDe: ${from}\nContenido: ${snippet}` },
        ],
        temperature: 0, max_tokens: 200,
      });

      const raw = res.choices[0].message.content?.trim();
      if (!raw || raw === "null") return reply.send({ transaction: null });
      try {
        return reply.send({ transaction: JSON.parse(raw) });
      } catch {
        return reply.send({ transaction: null });
      }
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
