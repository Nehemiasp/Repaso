// Fase 0: plugin mínimo «Hola». Se reemplaza por el orquestador real en la fase 2.
figma.showUI(__html__, { width: 360, height: 560, themeColors: true });

figma.ui.onmessage = (msg: { type: string }) => {
  if (msg.type === 'cerrar') figma.closePlugin();
};
