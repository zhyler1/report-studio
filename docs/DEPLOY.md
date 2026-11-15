# Publicar Report Studio (Nexus o un servidor)

## Con Docker
```
docker compose up -d --build        # http://servidor:8000 ; datos en ./data
```
Datos (`./data`): base `report_studio.db`, medios y la llave de sesión `.rs_secret`. **Respáldalos**: `scripts/backup.sh data backups`
(programa con cron, p. ej. `0 2 * * * cd /ruta && scripts/backup.sh`). Guarda los últimos 14.

## Usuarios y permisos
Mientras no exista ningún usuario la herramienta está abierta (modo local). **Crea el administrador antes de exponerla**:
```
docker compose exec report-studio python -m app.users add andres --role admin
docker compose exec report-studio python -m app.users add nomina --role lider --sections nomina
```
- `admin`: todo (portada, tema, secciones, crear/borrar informes, versiones, usuarios).
- `lider`: solo edita las secciones que se le asignan (ids: personal, nomina, bienestar, comunicacion, historias, sst) y las alertas de ese grupo. El servidor rechaza cualquier otro cambio.
- Pon HTTPS delante (Nexus, Caddy o nginx): la sesión viaja en una cookie.

## Lectura de documentos sin pagar API
- PDF, Word, PPT, Excel, HTML y texto se leen sin IA; los PDF escaneados pasan por OCR local (Tesseract).
- Para que arme las casillas con IA gratis usa tu modelo local: `RS_OLLAMA_URL=http://host.docker.internal:11434` (y `RS_OLLAMA_MODEL`). `ANTHROPIC_API_KEY` es opcional.
