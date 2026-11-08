/**
 * Lo define esbuild: `true` en `npm run build`, `false` en `npm run build:community`.
 * En pruebas y scripts no existe: se usa siempre con `typeof __AI__ === 'undefined' || __AI__`,
 * escrito en el mismo archivo donde se usa (esbuild no pliega constantes entre archivos), así el
 * código de IA se elimina de la versión comunidad. Ya no hay un `flags.ts` compartido por eso.
 */
declare const __AI__: boolean | undefined;
