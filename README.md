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
