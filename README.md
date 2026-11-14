# Report Studio

Genera informes interactivos (como el de la Oficina de Talento Humano) **desde datos**, no desde HTML escrito a mano.
Se desarrolla aparte de Nexus y se integrará después (ver `docs/DESIGN.md`).

## Estado (hito 1)
- [x] Esquema por bloques con validación (`backend/app/schema.py`, `validate.py`)
- [x] Conversión del informe actual a JSON (`scripts/migrate_seed.py` → `seed/report.seed.json`)
- [x] Pruebas de fidelidad: ningún texto del seed se inventa (`backend/tests/`)
- [ ] Renderizador: JSON → HTML (plantilla del informe v9)
- [ ] API FastAPI (CRUD, versiones, exportar HTML/PDF/QR)
- [ ] Admin React/Vite
- [ ] Importador (txt → docx → pptx → pdf) con pantalla de revisión

## Correr las pruebas
```bash
pip install -e ".[dev]"
pytest
```

## Regenerar el seed
```bash
python scripts/migrate_seed.py seed/Informe_TH.original.html seed/datos_informe.json seed/report.seed.json
```

## Archivos de `seed/`
- `Informe_TH.original.html`: el informe a mano del que se extrajo el texto (fuente de verdad del contenido).
- `Informe_TH.v9.html`: la plantilla visual actual (tema gris, fondos, calendario, modo presentación). Es el objetivo del renderizador.
- `datos_informe.json`: datos semilla originales.
- `report.seed.json`: el informe en el formato de Report Studio.


## Estado hito 1
- [x] Esquema por bloques + validación
- [x] Migración HTML → JSON (`scripts/migrate_seed.py`)
- [x] Shell derivado de la plantilla v9 (`scripts/make_shell.py`)
- [x] Renderizador `backend/app/render.py`: JSON → HTML idéntico a v9 (texto de todos los paneles y datos, verificado en jsdom)
- [ ] Verificación en navegador real

Uso: `cd backend && python3 -m app.render ../seed/report.seed.json salida.html`

## Estado hito 2 (API)
- [x] `backend/app/store.py`: SQLite, cada guardado crea una versión
- [x] `backend/app/api.py`: esquema, validar, CRUD, versiones y restaurar, vista previa, exportar HTML/PDF (Playwright), QR en SVG
- [x] `router` montable en Nexus: `app.include_router(router, prefix="/report-studio")`
- [ ] Interfaz de administración (React/Vite)

Desarrollo: `cd backend && uvicorn app.api:app --reload` (documentación en `/docs`). El PDF necesita `playwright install chromium`.

## Estado hito 3 (interfaz de administración, primera parte)
- [x] React + Vite + TypeScript en `frontend/`: lista de informes, importar JSON, duplicar, eliminar
- [x] Pestañas General (encabezado, inicio, apariencia), Secciones (orden, textos, ocultar), Alertas (tabla), JSON, Versiones (restaurar)
- [x] Vista previa en vivo con validación antes de guardar; exportar HTML/PDF
- [ ] Formularios por bloque (actividades, calendario, presupuesto, plantas, tablas...), gráficos, audio/video

Uso: `cd frontend && npm install && npm run build`; después el servidor (`cd backend && python -m uvicorn app.api:app`) sirve la interfaz en http://localhost:8000.
Desarrollo con recarga: `npm run dev` (puerto 5173, redirige /api al 8000).

### Hito 3, parte 2: control total desde formularios
- [x] Formularios generados desde el esquema (`frontend/src/SchemaForm.tsx`): cualquier bloque, tarjeta, tabla, calendario, presupuesto, plantas... se edita sin JSON; también agregar, duplicar, mover y borrar bloques y secciones
- [x] Subida de imagen, audio y video (`POST /api/media`, se guardan en `data/media` y se sirven en `/media`)
- [x] La vista previa conserva la pestaña donde estás al editar
- [ ] Pendiente: al exportar el HTML, los archivos subidos quedan como enlaces a `/media/...` (falta incrustarlos o publicarlos junto al informe)
- [x] Al recargar la página vuelve al informe, pestaña del editor, sección abierta y pestaña/posición de la vista previa; los cambios sin guardar se conservan como borrador en el navegador
