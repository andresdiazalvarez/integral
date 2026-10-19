# Generador de informes PCI

## Diagnóstico e integración

Correctivos utiliza IndexedDB `voz-db-v1`, BIE `bie-db-v1` e Hidrantes `integral-hidrantes-db-v1`. Los tres guardan el array original en `state/records`, con ID interno, datos de equipo, defectos, fotos como data URL y el campo Visto. No se presupone que Visto certifique ensayos. Hidrantes sigue siendo una adaptación pendiente desde extintores.

Sistemas utiliza `sistemas-informes-db`, almacén `state`, clave `sistemas.informes.v2`, con respaldo en localStorage. Guarda informes estructurados (`savedReports`, `sourceEntries`, secciones, casillas y fotos); no guarda normalmente el binario PDF. La integración añade un puente de solo lectura que llama a `buildFullHtml` y a la generación PDF existente, devolviendo un Blob sin descargar ni volver a guardar el informe. No cambia las reglas de mantenimiento.

También se ofrece el **Trabajo abierto en Sistemas**, obtenido de `current.entries` (o de `current.systems` en formatos antiguos), aunque todavía no se haya archivado como informe. Conserva todos sus sistemas, textos y fotografías. Si ese trabajo edita un informe guardado, se ofrece la versión abierta una sola vez y se conserva su identificador. El generador actualiza las fuentes al volver desde otro módulo y antes de generar. Los cambios en el origen siguen requiriendo confirmar de nuevo la asignación.

Los equipos antiguos no tienen centro y revisión inequívocos. La ampliación mínima es un índice separado de asignaciones: referencia de origen, centro seleccionado, revisión/año, huella del contenido, usuario y fecha de asignación. No copia registros ni fotografías. Si cambia el origen, el generador bloquea la asignación antigua. El usuario debe asignar explícitamente los datos de la revisión: la aplicación no puede reconstruir revisiones históricas que nunca se guardaron.

Los documentos del expediente, firmas autorizadas, preferencias, fichas, borradores e historial se guardan localmente en `integral-pci-meta-v1`. Los registros de mantenimiento siguen en sus bases originales. Los archivos externos del expediente se almacenan una vez por referencia, sin publicarlos en GitHub.

## Archivos

- `informes/core.js`: identidad, normalización conservadora, deduplicación y validaciones.
- `informes/data.js`: lectura de los almacenes existentes y persistencia de metadatos.
- `informes/pdf-service.js`: acta nueva, informes estructurados con texto seleccionable, imágenes proporcionadas, unión de páginas completas y paginación general PCI.
- `informes/ui.js`, `index.html`, `style.css`: pasos, selección, firmas, miniaturas, vista previa y exportación.
- `modulos/sistemas/index.html`: puente para obtener el PDF de informes guardados con el generador original.
- `app.js`, `index.html`, `styles.css`, `sw.js`: acceso integrado y actualización de recursos.
- `tests/pci.test.cjs`: comprobaciones de identidad, incidencias, revisiones y páginas.

## Utilización

Para ver el documento aunque falten datos, pulsa **Ver informe con datos disponibles** en la cabecera o **Generar con datos incompletos** en el último paso. No es necesario marcar la validación. Se genera un borrador descargable con los datos seleccionados; los campos vacíos se indican como «No informado» o «No verificado», y todas las páginas llevan la indicación de borrador. Se mantienen los controles de centro/revisión, origen modificado, PDF ilegible y autorización de firmas.

La cabecera distingue **disponibles**, **asignados** e **incluidos**, y muestra los equipos con correctivos y las fotos que se exportarán. Si hay registros guardados pero ninguno incluido, al generar aparece la selección por clientes. Marca los que pertenecen al trabajo, confirma su correspondencia y pulsa **Incorporar seleccionados y generar PDF**. Los registros vinculados a otro expediente no se trasladan desde este acceso rápido. Puedes incorporar los equipos sin completar los campos administrativos; el borrador conserva esos datos como no informados. La opción de continuar sin equipos requiere una acción explícita.

1. Abre INTEGRAL desde la misma dirección y navegador donde guardas los registros. Pulsa **Generar informe PCI** y **Actualizar datos de los módulos**.
2. Indica centro oficial, código, revisión, año, fechas y usuario. Selecciona y asigna solo los registros e informes que correspondan. Los módulos que tienen datos aparecen preseleccionados; desmarca los que no se incorporen.
3. En **Acta**, elige nueva o anterior como referencia. Completa y revisa todos los datos actuales. El acta anterior muestra sus páginas y texto; puede proponer algunos datos administrativos, que requieren revisión. Los escaneos sin texto se transcriben manualmente; no hay OCR automático. No se trasladan firmas, comprobaciones, técnicos, horas ni fechas de trabajos anteriores.
4. Guarda las fichas de empresa y cliente si deseas reutilizarlas. Selecciona los sistemas efectivamente mantenidos. Completa verificaciones (sin selección = no verificado). Las firmas en imagen son opcionales y requieren autorización expresa.
5. En **Sistemas y PDF**, utiliza los informes asignados o añade PDF. Revisa miniaturas y páginas, ordena documentos y marca como históricos los que sean antecedentes. Una hoja técnica opcional se asigna al acta, antes de extintores. Si un PDF consolidado ya contiene un informe, excluye ese informe guardado o sus entradas.
6. En **Correctivos**, revisa incidencias consolidadas y textos de sistemas que necesitan clasificación. Añade únicamente incidencias documentadas con origen/evidencia. No se interpretan todas las casillas como averías. Los antecedentes de exportaciones anteriores del mismo centro requieren activación y selección individual.
7. En **Revisar y generar**, revisa conteos, exclusiones de registros/fotos, alertas y confirmaciones. Genera la vista previa, comprueba todas sus páginas y descarga el PDF. El nombre lleva fecha/hora para conservar versiones. El historial recoge usuario, referencias, selección, orden y rangos de páginas.

## Modelo y límites

El acta reproduce la estructura del modelo aportado: identificación, notificaciones, titular, empresa, instalación, verificaciones, equipos, ejecución, observaciones y firmas. Se genera texto nuevo y casillas según la revisión actual; no se incrusta el formulario rellenado del modelo ni sus centros o datos personales. No se reproducen logotipos de certificación como si acreditaran este nuevo documento.

El orden principal es fijo: acta, hoja técnica opcional, extintores, BIE, hidrantes, sistemas y relación final de correctivos. Los informes técnicos existentes conservan sus páginas y fotografías completas. La nueva paginación PCI se añade al pie y no sustituye numeraciones históricas. La imagen de firma no se denomina firma digital certificada.

En los bloques de extintores, BIE e hidrantes se muestran primero los equipos con correctivos. El anexo fotográfico empieza siempre en una página nueva, después de todos los datos del bloque. En extintores se incluyen solo fotos de equipos con correctivos; en BIE e hidrantes se incluyen todas las fotos seleccionadas, también de equipos sin correctivos. En «Revisar y generar» se eligen 6 u 8 fotos por hoja: dos columnas y tres o cuatro filas. Por defecto se utilizan 6. Cada imagen conserva sus proporciones e identificación de equipo y ubicación. La última hoja contiene las imágenes restantes sin duplicarlas.

Los correctivos se presentan en tablas compactas agrupadas por incidencia, siguiendo la referencia visual: título centrado, franja azul con el tipo de defecto, encabezados azul claro y bordes negros. Columnas: Edificio/Dependencia, Nº Extintor/BIE/Hidrante, Modelo e Incidencia. Los campos ausentes aparecen con raya; los identificadores conservan su formato textual. Al continuar una tabla en otra página se repiten la franja del grupo y las columnas. El texto técnico original se conserva en cada fila. Las mismas columnas se utilizan para estos equipos en la relación final consolidada.

La detección automática de PDF duplicados usa SHA-256 del archivo. No identifica de forma infalible secciones iguales dentro de PDF diferentes: la revisión por miniaturas y la exclusión explícita siguen siendo necesarias. No se extraen automáticamente todas las incidencias de PDF externos o escaneados; el usuario debe incorporarlas con su referencia antes de confirmar los correctivos. No se eliminan automáticamente páginas originales en blanco.

La comparación histórica utiliza incidencias del historial de exportaciones realizadas desde el generador. No hay recuperación automática de actas antiguas como base de correctivos. Se puede incorporar una incidencia documentada adicional con su origen; la selección de antecedentes no declara que el defecto se haya vuelto a comprobar ni que esté resuelto.

Esta aplicación es local en el navegador: no hay autenticación de usuarios, base de datos remota ni sincronización entre móviles. El nombre del usuario del historial es declarado, no una identidad autenticada. Mantén copias de los datos y PDF. El expediente no convierte datos no comprobados en cumplimiento normativo.

## Verificación

Ejecuta `node --test tests/pci.test.cjs`. En el navegador, comprueba una revisión con IDs repetidos en edificios distintos, dos defectos diferentes del mismo equipo, cuatro fotos, acta con y sin firma, PDF de sistemas de varias páginas y antecedente marcado. Verifica las referencias, el orden, el anexo fotográfico y la relación final. Cambia un registro en origen y comprueba que obliga a actualizar la asignación. Exporta, recarga y recupera el borrador sin perder selecciones.

Los expedientes reales se validan en el navegador del usuario, donde residen sus datos. Los ensayos de desarrollo utilizan datos sintéticos y no fijan centros, cantidades ni revisiones de los ejemplos del encargo.
