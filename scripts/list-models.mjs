import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/GEMINI_API_KEY=(.*)/);
  if (match) apiKey = match[1].trim();
}
const ai = new GoogleGenAI({ apiKey });

(async () => {
  try {
    const models = await ai.models.list();
    for await (const model of models) {
        console.log(model.name);
    }
  } catch (e) {
    console.error('Error:', e);
  }
})();
