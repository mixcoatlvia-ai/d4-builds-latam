import { chromium } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Cargar la API key
const envPath = path.resolve('.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/GEMINI_API_KEY=(.*)/);
  if (match) apiKey = match[1].trim();
}
const ai = new GoogleGenAI({ apiKey });

// Lista de Builds a procesar
const URLS_A_PROCESAR = [
  {
    url: 'https://maxroll.gg/d4/build-guides/minion-necromancer-guide',
    clase: 'Nigromante',
    tipoBuild: 'Leveo (1-60)',
    nombre: 'Nigromante de Esbirros (Minions)'
  },
  {
    url: 'https://maxroll.gg/d4/build-guides/chain-lightning-sorcerer-guide',
    clase: 'Hechicero',
    tipoBuild: 'Leveo (1-60)',
    nombre: 'Hechicero Cadena de Relámpagos'
  }
];

const SYSTEM_INSTRUCTION = `Eres un experto localizador y jugador apasionado de Diablo 4. 
Tu tarea es leer una guía en inglés y extraer su progresión estructurada en JSON.
DEBES traducir TODO al Español Latino oficial (ej. "Sorcerer" -> "Hechicero", "Minions" -> "Esbirros").

Devuelve EXACTAMENTE este formato JSON puro (sin bloques markdown):
[
  {
    "id": "lvl1-15",
    "nivel": "Etapa de Nivel (ej. 1-15)",
    "descripcion": "Descripción resumida",
    "dondeBuscar": "Zonas sugeridas",
    "habilidades": ["Hab 1", "Hab 2"],
    "equipo": [ { "slot": "Ranura (ej. Casco)", "item": "Atributo o Aspecto" } ]
  }
]`;

(async () => {
  const dataPath = path.resolve('src/data/builds.json');
  let db = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const job of URLS_A_PROCESAR) {
    console.log(`\n=> Extrayendo [${job.clase}] ${job.nombre}...`);
    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000); // Dar tiempo a React

      const rawText = await page.evaluate(() => {
        return (document.querySelector('main') || document.body).innerText;
      });

      console.log('Enviando a Gemini para traducir y estructurar...');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: rawText,
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.1 }
      });

      let jsonResponse = response.text.trim();
      if (jsonResponse.startsWith('```json')) {
        jsonResponse = jsonResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
      }

      const guia = JSON.parse(jsonResponse);

      // Insertar en la BD local
      if (!db.builds[job.clase]) db.builds[job.clase] = {};
      if (!db.builds[job.clase][job.tipoBuild]) db.builds[job.clase][job.tipoBuild] = [];
      
      db.builds[job.clase][job.tipoBuild].push({
        nombre: job.nombre,
        guia: guia
      });

      console.log('¡Éxito! Agregada a la base de datos.');
      
      // Guardar parcial por si falla el siguiente
      fs.writeFileSync(dataPath, JSON.stringify(db, null, 2));

    } catch (e) {
      console.error(`Error procesando ${job.nombre}:`, e);
    }
  }

  await browser.close();
  console.log('\nFábrica de Builds terminada. ¡Página actualizada!');
})();
