import { chromium } from 'playwright';

(async () => {
  console.log('Iniciando navegador invisible...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Vamos a usar una build de ejemplo del Bárbaro Remolino
  const targetUrl = 'https://maxroll.gg/d4/build-guides/whirlwind-barbarian-guide';
  console.log(`Navegando a: ${targetUrl}`);
  
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  
  console.log('Página cargada. Extrayendo título...');
  const title = await page.title();
  console.log('====================================');
  console.log(`Título de la Build: ${title}`);
  console.log('====================================');

  // Aquí en el futuro buscaremos los selectores específicos de las habilidades, 
  // los items, el paragón, etc. Maxroll usa muchos componentes de React,
  // por lo que esperaremos un par de segundos para que renderice todo.
  await page.waitForTimeout(3000); 

  console.log('Prueba de extracción exitosa. ¡Estamos listos para sacar los datos duros!');
  
  await browser.close();
})();
