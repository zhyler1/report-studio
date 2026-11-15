"""Administrar usuarios desde la terminal.

  python -m app.users add andres --role admin
  python -m app.users add nomina --role lider --sections nomina
  python -m app.users list | del nomina
"""
import argparse
import getpass

from .api import get_store
from .auth import hash_pw


def main():
    p = argparse.ArgumentParser(prog="app.users")
    p.add_argument("cmd", choices=["add", "list", "del"])
    p.add_argument("name", nargs="?")
    p.add_argument("--role", default="lider", choices=["admin", "lider"])
    p.add_argument("--sections", default="", help="ids de sección separados por coma (para líderes)")
    a = p.parse_args()
    s = get_store()
    if a.cmd == "list":
        for u in s.list_users():
            print(u["name"], u["role"], ",".join(u["sections"]))
    elif a.cmd == "del":
        print("borrado" if s.del_user(a.name) else "no existe")
    else:
        pw = getpass.getpass("Contraseña (mínimo 6): ")
        assert len(pw) >= 6, "muy corta"
        s.put_user(a.name, hash_pw(pw), a.role, [x for x in a.sections.split(",") if x])
        print("listo")


if __name__ == "__main__":
    main()
