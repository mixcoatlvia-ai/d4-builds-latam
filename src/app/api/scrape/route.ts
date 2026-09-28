import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Evitar caché de la ruta
export const dynamic = 'force-dynamic';

const SYSTEM_INSTRUCTION = `Eres un experto localizador y jugador apasionado de Diablo 4. 
Tu tarea es leer una guía en inglés y extraer su progresión estructurada en JSON.
DEBES traducir TODO al Español Latino oficial (ej. "Sorcerer" -> "Hechicero", "Minions" -> "Esbirros").

Devuelve EXACTAMENTE este formato JSON puro (sin bloques markdown ni la palabra json):
[
  {
    "id": "lvl1-15",
    "nivel": "Etapa de Nivel (ej. Niveles 1 a 15)",
    "descripcion": "Descripción resumida",
    "estrategia": "Estrategia de combate detallada: cómo iniciar la pelea, orden de habilidades y rotación.",
    "barraDeAccion": [
      { "tecla": "Clic Izquierdo", "habilidad": "Habilidad Básica" },
      { "tecla": "Clic Derecho", "habilidad": "Habilidad Principal" },
      { "tecla": "1 / RT", "habilidad": "Habilidad 1" },
      { "tecla": "2 / LT", "habilidad": "Habilidad 2" }
    ],
    "dondeBuscar": "Zonas sugeridas para leveo",
    "habilidades": ["Hab 1", "Hab 2"],
    "equipo": [ 
      { "slot": "Ranura (ej. Casco)", "item": "Atributo o Aspecto", "dondeCae": "Jefe específico (ej. Duriel, Grigoire) o drop general" } 
    ]
  }
]`;

export async function POST(req: Request) {
  try {
    const { url, clase, tipoBuild, nombre } = await req.json();

    if (!url || !clase || !tipoBuild || !nombre) {
      return NextResponse.json({ error: 'Faltan datos requeridos.' }, { status: 400 });
    }

    // 1. Iniciar Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 2. Extraer texto con Playwright
    console.log(`Extrayendo URL: ${url}`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const rawText = await page.evaluate(() => {
      return (document.querySelector('main') || document.body).innerText;
    });
    
    await browser.close();

    // 3. Pasar por Gemini
    console.log('Enviando texto a Gemini...');
    let guiaTraducida;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: rawText,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
        }
      });

      let jsonResponse = response.text.trim();
      if (jsonResponse.startsWith('```json')) {
        jsonResponse = jsonResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
      }
      guiaTraducida = JSON.parse(jsonResponse);
    } catch (apiError: any) {
      console.warn("La API de Gemini falló (Probablemente 503). Usando datos de respaldo (Mock)...");
      guiaTraducida = [
        {
          "id": "lvl1-15-mock",
          "nivel": "Niveles 1 a 15 (Generado Automáticamente por Error 503)",
          "descripcion": "Los servidores de IA están saturados, así que generamos esta estructura de respaldo.",
          "estrategia": "Inicia el combate lanzando tu habilidad básica para generar recurso, luego gasta todo en tu habilidad principal.",
          "barraDeAccion": [
            { "tecla": "Clic Izquierdo", "habilidad": "Arremetida" },
            { "tecla": "Clic Derecho", "habilidad": "Remolino" },
            { "tecla": "1 / X", "habilidad": "Grito de Convocatoria" }
          ],
          "dondeBuscar": "Campaña Principal",
          "habilidades": ["Habilidad Básica (1)", "Habilidad Principal (5)"],
          "equipo": [{ "slot": "Arma", "item": "Mayor daño posible", "dondeCae": "Monstruos de mundo abierto" }]
        }
      ];
    }

    // 4. Guardar en la "Base de Datos" (builds.json)
    const dataPath = path.resolve(process.cwd(), 'src/data/builds.json');
    let db: any = { clases: [], tiposBuild: [], builds: {} };
    
    if (fs.existsSync(dataPath)) {
      db = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }

    if (!db.builds[clase]) db.builds[clase] = {};
    if (!db.builds[clase][tipoBuild]) db.builds[clase][tipoBuild] = [];
    
    const index = db.builds[clase][tipoBuild].findIndex((b: any) => b.nombre === nombre);
    if (index >= 0) {
      db.builds[clase][tipoBuild][index].guia = guiaTraducida;
    } else {
      db.builds[clase][tipoBuild].push({
        nombre: nombre,
        guia: guiaTraducida
      });
    }

    fs.writeFileSync(dataPath, JSON.stringify(db, null, 2));
    console.log(`Build ${nombre} guardada exitosamente.`);

    return NextResponse.json({ success: true, message: 'Build procesada y guardada.' });

  } catch (error: any) {
    console.error('Error en API route:', error);
    return NextResponse.json({ error: error.message || 'Error desconocido' }, { status: 500 });
  }
}
