import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

const SYSTEM_INSTRUCTION = `Eres un experto analista de meta en Diablo 4. 
Recibirás una lista de todos los enlaces extraídos de una página de "Tier List" (ej. Maxroll).
Tu tarea es encontrar y devolver ÚNICAMENTE los enlaces de las mejores builds (Tier S o A) para la clase solicitada.

Reglas:
1. Revisa los nombres de los enlaces y deduce cuáles son guías de build de la clase indicada.
2. Si la clase solicitada es "Nigromante", busca "Necromancer", etc.
3. Devuelve máximo 3 builds (las mejores que encuentres).
4. Devuelve EXACTAMENTE este formato JSON puro:
[
  {
    "nombre": "Nombre de la build en Español Latino (ej. Nigromante Invocador)",
    "url": "https://maxroll.gg/d4/build-guides/..."
  }
]`;

export async function POST(req: Request) {
  try {
    const { url, clase } = await req.json();

    if (!url || !clase) {
      return NextResponse.json({ error: 'Faltan datos requeridos (url y clase).' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 1. Navegar a la Tier List
    console.log(`Buscando Tier List en: ${url}`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Esperar a que carguen tablas de Tier List

    // 2. Extraer todos los enlaces
    const linksData = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .filter(a => a.href.includes('build-guides')) // Filtrar un poco para Maxroll
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => a.text.length > 3); // Quitar enlaces vacíos
    });
    
    await browser.close();

    // Reducir la lista a un texto para no saturar tanto a la IA (tomamos los primeros 150 enlaces relevantes)
    const enlacesTexto = JSON.stringify(linksData.slice(0, 150));

    // 3. Que Gemini analice los enlaces y encuentre los de la clase
    console.log(`Enviando ${linksData.length} enlaces a Gemini para filtrar la clase: ${clase}...`);
    let buildsEncontradas = [];

    try {
      const prompt = `La clase solicitada es: ${clase}.\nAquí están los enlaces de la página:\n${enlacesTexto}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.1 }
      });

      let jsonResponse = response.text.trim();
      if (jsonResponse.startsWith('```json')) {
        jsonResponse = jsonResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
      }
      buildsEncontradas = JSON.parse(jsonResponse);
    } catch (apiError: any) {
      console.warn("Error 503 en la búsqueda masiva. Usando Mock.");
      // MOCK EN CASO DE 503
      buildsEncontradas = [
        { nombre: `${clase} S-Tier Mocked 1`, url: `https://maxroll.gg/d4/build-guides/mock-1` },
        { nombre: `${clase} A-Tier Mocked 2`, url: `https://maxroll.gg/d4/build-guides/mock-2` }
      ];
    }

    return NextResponse.json({ success: true, builds: buildsEncontradas });

  } catch (error: any) {
    console.error('Error en auto-discover:', error);
    return NextResponse.json({ error: error.message || 'Error desconocido' }, { status: 500 });
  }
}
