import { chromium } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Cargar la API key desde .env.local manualmente
const envPath = path.resolve('.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/GEMINI_API_KEY=(.*)/);
  if (match) apiKey = match[1].trim();
}

const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `Eres un experto localizador y jugador apasionado de Diablo 4. 
Tu tarea es traducir builds, habilidades, aspectos, glifos, atributos de objetos y nodos de leyenda 
del inglés al Español Latino EXACTAMENTE como aparecen en la versión oficial del juego.

Reglas importantes:
- "Barbarian" -> "Bárbaro", "Rogue" -> "Pícaro", "Sorcerer" -> "Hechicero", "Druid" -> "Druida", "Necromancer" -> "Nigromante".
- "Whirlwind" -> "Remolino", "Core Skill" -> "Habilidad Principal", "Basic Skill" -> "Habilidad Básica".
- "Endgame Build Guide" -> "Guía de Build de Juego Tardío (Endgame)" o algo natural en la comunidad de LATAM.
- Mantén el formato y la estructura del texto original.
- Si no estás seguro de un término oficial, tradúcelo de la manera más natural en el contexto de D4 en LATAM.
- No incluyas explicaciones adicionales, solo devuelve el texto traducido.`;

(async () => {
  console.log('1. Extrayendo texto desde Maxroll...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://maxroll.gg/d4/build-guides/whirlwind-barbarian-guide', { waitUntil: 'domcontentloaded' });
  const rawTitle = await page.title();
  await browser.close();

  console.log('Texto extraído:', rawTitle);
  console.log('\n2. Enviando a Gemini para traducir al español latino de D4...');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: rawTitle,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
      }
    });

    console.log('\n================ RESULTADO ================');
    console.log(response.text);
    console.log('===========================================');
    console.log('\n¡El flujo completo de Extracción -> Traducción funciona perfectamente!');
  } catch (error) {
    console.error('Error al traducir:', error);
  }
})();
