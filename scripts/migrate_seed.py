"""Convierte el informe escrito a mano + datos_informe.json al formato de Report Studio.

Uso:  python scripts/migrate_seed.py seed/Informe_TH.original.html seed/datos_informe.json seed/report.seed.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.legacy import main  # noqa: E402

if __name__ == "__main__":
    main(sys.argv[1:])
