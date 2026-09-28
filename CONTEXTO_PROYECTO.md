# 🎮 Contexto del Proyecto: Sanctuario Builds (D4 Builds LATAM)

## 🎯 Objetivo del Proyecto
Una aplicación web personalizada para consultar guías y builds de Diablo 4. Diseñada para ser "For Dummies", completamente en Español Latino, y con un sistema de progreso (checklists) guardado localmente para que el usuario y su "compadre" puedan armar sus personajes sin complicaciones.

## 🛠️ Stack Tecnológico
* **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript.
* **Scraping / Extracción:** Playwright (Navegador headless).
* **Inteligencia Artificial:** Google Gemini API (`gemini-3.6-flash`) para traducir, interpretar y estructurar la información masiva en JSON.
* **Base de Datos:** Archivo estático `src/data/builds.json`.
* **Despliegue:** GitHub (Repositorio personal) + Vercel (Hosting gratuito).

## 🏗️ Arquitectura y Funcionalidades
1. **Modo Jugador (Público en Vercel):**
   * Interfaz oscura estilo Diablo (Rojo/Negro).
   * Filtros en cascada: Clase -> Objetivo (Leveo, Endgame, etc.) -> Build.
   * Acordeón interactivo por niveles.
   * Contiene **Estrategia y Rotación**, **Barra de Acción (Botones sugeridos)**, y **Target Farming (Dónde caen los ítems)**.
   * Sistema de *Checklists* para Habilidades y Equipo guardado en el `localStorage` del celular/navegador de cada usuario.

2. **Modo Administrador "Fábrica de Builds" (Solo Localhost):**
   * **Búsqueda 1x1:** Ingresas una URL de Maxroll, Playwright la lee, Gemini la traduce al formato JSON estricto, y se guarda automáticamente en `builds.json`.
   * **Búsqueda Masiva (El "Veo Burro y Se Me Antoja El Viaje"):** Ingresas una URL de una *Tier List*. El sistema extrae todos los enlaces, Gemini filtra los de la clase deseada que sean "S-Tier" o "A-Tier", y lanza la extracción en cadena para cada uno.
   * *Manejo de Errores:* Si la API de Gemini sufre un Error 503 (Saturación global), el sistema tiene un "Paracaídas" que inyecta Mock Data (datos de prueba) para que la UI no colapse.

## 🔄 Flujo de Trabajo (Cómo agregar nuevas builds)
Dado que Vercel no soporta el navegador pesado de Playwright de forma gratuita, el proceso para actualizar la página es:
1. Abrir el proyecto en la computadora local y correr `npm run dev`.
2. Usar el **Modo Admin** en `localhost:3000` para raspar y traducir nuevas builds.
3. Hacer un commit y push a GitHub con el archivo `src/data/builds.json` actualizado.
4. Vercel detecta el cambio en GitHub y actualiza la página pública automáticamente en 1 minuto.

## 🚀 Estado Actual (Al cierre de la última sesión)
* Código funcional y subido al repositorio personal de GitHub (`mixcoatlvia-ai/d4-builds-latam`).
* Desplegado exitosamente en Vercel (Accesible en el dominio público `.vercel.app`).
* La estructura base de datos soporta alto nivel de detalle (teclas, rotaciones, lugares de farmeo).
* La API de Gemini fue ajustada al modelo `gemini-3.6-flash` para evitar congestión de tráfico global.

## 📝 Próximos Pasos (Ideas para la siguiente sesión)
1. Extraer el "Meta" completo de las demás clases (Hechicero, Pícaro, Druida, etc.) usando el Buscador Masivo.
2. Agregar imágenes o íconos visuales a las clases e ítems para hacerlo aún más atractivo.
3. Probar la página jugando D4 en vivo y pulir la experiencia en dispositivos móviles.
