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
Recibirás un texto crudo extraído de una guía de Maxroll. 
Tu tarea es analizarlo, extraer la progresión de leveo, habilidades, equipo y zonas de farmeo, 
y estructurarlo en un JSON válido con la siguiente estructura:

[
  {
    "id": "lvl1-15",
    "nivel": "Niveles 1 a 15",
    "descripcion": "Descripción resumida de cómo jugar en esta etapa.",
    "dondeBuscar": "Zonas de leveo sugeridas (ej. Mareas Infernales, Campaña, etc.)",
    "habilidades": ["Habilidad 1 (x ptos)", "Habilidad 2"],
    "equipo": [
      { "slot": "Arma", "item": "Atributos o Aspectos recomendados" }
    ]
  }
]

Reglas:
1. Extrae y resume al menos 4 etapas de leveo (ej. 1-15, 15-30, 30-50, 50+).
2. TRADUCE TODO al Español Latino oficial de Diablo 4 ("Barbarian" -> "Bárbaro", "Whirlwind" -> "Remolino", "Helltides" -> "Mareas Infernales").
3. DEVUELVE ÚNICAMENTE EL JSON. Sin bloques de código markdown, solo el texto JSON puro.`;

(async () => {
  console.log('1. Extrayendo texto desde Maxroll...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://maxroll.gg/d4/build-guides/whirlwind-barbarian-guide', { waitUntil: 'domcontentloaded' });
  
  // Esperamos un poco para que carguen los componentes de React
  await page.waitForTimeout(3000);

  // Extraemos todo el texto visible del artículo o del body principal
  const rawText = await page.evaluate(() => {
    // Intentar buscar el contenedor principal de la guía
    const mainContent = document.querySelector('main') || document.body;
    return mainContent.innerText;
  });
  
  await browser.close();

  console.log(`Texto extraído: ${rawText.substring(0, 150)}... (${rawText.length} caracteres)`);
  console.log('\n2. Enviando a Gemini para análisis, traducción y formateo a JSON...');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: rawText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      }
    });

    let jsonResponse = response.text.trim();
    // Limpiar posibles bloques markdown si Gemini los llega a poner
    if (jsonResponse.startsWith('```json')) {
      jsonResponse = jsonResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
    }

    // Validar y parsear
    const parsedData = JSON.parse(jsonResponse);

    // Guardar el JSON en un archivo para que el frontend lo consuma
    const dataPath = path.resolve('src/data');
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
    
    fs.writeFileSync(path.join(dataPath, 'whirlwind.json'), JSON.stringify(parsedData, null, 2));

    console.log('\n================ EXTRACCIÓN EXITOSA ================');
    console.log(`¡Se guardaron ${parsedData.length} etapas en src/data/whirlwind.json!`);
  } catch (error) {
    console.error('Error al procesar con Gemini:', error);
  }
})();
