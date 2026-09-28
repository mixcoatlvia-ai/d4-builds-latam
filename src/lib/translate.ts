import { GoogleGenAI } from '@google/genai';

// Initialize the client. It will automatically use the GEMINI_API_KEY environment variable.
const ai = new GoogleGenAI({});

const SYSTEM_INSTRUCTION = `Eres un experto localizador y jugador apasionado de Diablo 4. 
Tu tarea es traducir builds, habilidades, aspectos, glifos, atributos de objetos y nodos de leyenda 
del inglés al Español Latino EXACTAMENTE como aparecen en la versión oficial del juego.

Reglas importantes:
- "Barbarian" -> "Bárbaro", "Rogue" -> "Pícaro", "Sorcerer" -> "Hechicero", "Druid" -> "Druida", "Necromancer" -> "Nigromante".
- "Whirlwind" -> "Remolino", "Core Skill" -> "Habilidad Principal", "Basic Skill" -> "Habilidad Básica".
- Mantén el formato y la estructura del texto original.
- Si no estás seguro de un término oficial, tradúcelo de la manera más natural en el contexto de D4 en LATAM.
- No incluyas explicaciones adicionales, solo devuelve el texto traducido.`;

export async function translateD4Text(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: text,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for more consistent, less creative translations
      }
    });
    return response.text;
  } catch (error) {
    console.error('Error translating text:', error);
    throw error;
  }
}
