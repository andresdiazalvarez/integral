# INTEGRAL

Aplicación local que reúne Correctivos, BIE, Hidrantes y Sistemas con navegación común. Los módulos permanecen cargados al cambiar de sección para conservar formularios en curso. Cada módulo conserva sus funciones, importaciones y exportaciones.

## Abrir

Ejecutar `node server.cjs` en esta carpeta y abrir http://127.0.0.1:4173. Mantener la misma dirección y puerto para acceder a los registros guardados. No abrir index.html directamente como archivo.

## Alcance

Esta primera integración reúne los cuatro módulos existentes; no unifica sus modelos de datos ni crea un expediente de cliente compartido. Las aplicaciones originales no se han modificado. Se han utilizado voz-app para Correctivos, la raíz de BIE, hidrantes-base-correctivos y la raíz de sistemas.

Hidrantes es una base pendiente de adaptación y conserva campos e informes de extintores. Sus registros se han separado de Correctivos para evitar colisiones. Las cachés de cada módulo tienen un prefijo propio para que no eliminen las de los demás.

Los datos y fotos de las aplicaciones anteriores permanecen en sus navegadores y direcciones originales. Exportar allí e importar en el módulo correspondiente cuando el formato lo permita. Guardar copias de los trabajos antes de trasladarlos. No hay sincronización entre dispositivos.

El menú y los recursos locales se almacenan para uso sin conexión tras la primera apertura. Sistemas usa bibliotecas externas para algunas exportaciones; estas funciones requieren conexión mientras no estén disponibles en caché.
