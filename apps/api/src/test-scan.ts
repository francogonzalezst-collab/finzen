import "dotenv/config";
import { fetchAndParseEmails } from "./lib/emailParser";

const REFRESH_TOKEN = process.argv[2];

if (!REFRESH_TOKEN) {
  console.log("Uso: npx ts-node src/test-scan.ts TU_REFRESH_TOKEN");
  process.exit(1);
}

async function main() {
  console.log("Iniciando escaneo...");
  const results = await fetchAndParseEmails(REFRESH_TOKEN);
  console.log("Total encontrados:", results.length);
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
