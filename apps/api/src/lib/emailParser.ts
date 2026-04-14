import { google } from "googleapis";
import { openai } from "./openai";
import "dotenv/config";

const SENDERS = [
  "bancochile.cl","santander.cl","bci.cl","falabella.com",
  "mercadopago.cl","transbank.cl","entel.cl","claro.cl",
  "enel.cl","netflix.com","uber.com","rappi.com"
];

export async function getGmailClient(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function fetchAndParseEmails(refreshToken: string) {
  const gmail = await getGmailClient(refreshToken);
  const query = SENDERS.map(s => `from:${s}`).join(" OR ");

  const { data } = await gmail.users.messages.list({
    userId: "me", q: query, maxResults: 20,
  });

  if (!data.messages) return [];
  const results = [];

  for (const msg of data.messages) {
    const { data: full } = await gmail.users.messages.get({
      userId: "me", id: msg.id!, format: "full",
    });

    const subject = full.payload?.headers?.find(h => h.name === "Subject")?.value || "";
    const from = full.payload?.headers?.find(h => h.name === "From")?.value || "";
    const body = extractBody(full.payload);
    const snippet = `Asunto: ${subject}\nDe: ${from}\nContenido: ${body.slice(0, 400)}`;

    const parsed = await parseWithAI(snippet);
    if (parsed) results.push({ ...parsed, gmailMessageId: msg.id });
  }

  return results;
}

function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }
  }
  return "";
}

async function parseWithAI(snippet: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Eres un extractor de datos financieros para Chile.
Extrae transacciones desde correos bancarios.
Responde SOLO con JSON válido, sin explicaciones ni markdown.
Schema: {"type":"income|expense|bill","amount":number,"currency":"CLP","merchant":"string","date":"YYYY-MM-DD","status":"completed|pending","category":"Alimentación|Transporte|Combustible|Servicios|Entretenimiento|Restaurantes|Ingresos|Otros","is_bill":boolean}
Si no hay transacción responde: null`,
      },
      { role: "user", content: snippet },
    ],
    temperature: 0,
    max_tokens: 200,
  });

  const raw = res.choices[0].message.content?.trim();
  if (!raw || raw === "null") return null;
  try { return JSON.parse(raw); } catch { return null; }
}
