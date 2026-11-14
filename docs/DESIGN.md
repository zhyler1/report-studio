# Diseño de Report Studio

## Decisiones tomadas
- Proyecto **independiente** de Nexus; se integra después. Mismo stack para que encaje: FastAPI (backend) + React/Vite (admin).
- Esquema **por bloques**: un informe = metadatos + secciones; cada sección = bloques (o pestañas con bloques).
  Tipos nuevos (gráficos, audio, video) se agregan como clases del esquema + una función de dibujo.
- Texto enriquecido limitado a `**negrilla**`: nunca llega HTML arbitrario al informe.
- Los archivos pesados (imagen, audio, video) no se incrustan: viven en el servidor de media y el informe guarda la URL.
  Si no carga, el informe muestra el marcador punteado con el nombre del archivo (`slot`).

## Cómo se integrará en Nexus
- Backend: `app.main:router` se monta en Nexus con `include_router(prefix="/reports")`. Sin estado global propio.
- Admin: el admin se publica como una ruta más del front de Nexus (mismo diseño oscuro).
- Datos: el JSON versionado es la única fuente; Nexus solo aporta almacenamiento y autenticación.

## Pendientes de decidir
- Si Llama 3.1 70B solo clasifica/ubica campos al importar, o también redacta borradores.
- Dónde se aloja el HTML final (servidor de media de Presidencia vs otro).
- Un solo editor o uno por grupo (permisos por sección).
- Niveles de las alertas (los de Nómina vienen de su lámina; el resto son propuestos).
