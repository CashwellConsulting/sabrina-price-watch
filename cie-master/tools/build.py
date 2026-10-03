#!/usr/bin/env python3
"""Bundle index.html + css + js into one self-contained file: dist/CIE_Master.html.

Standard library only. Run from anywhere:  python3 cie-master/tools/build.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "CIE_Master.html"


def inline(html: str) -> str:
    def css(m):
        return "<style>\n" + (ROOT / m.group(1)).read_text(encoding="utf-8") + "\n</style>"

    def js(m):
        code = (ROOT / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
        return f"<script>/* {m.group(1)} */\n{code}\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
    return re.sub(r'<script src="([^"]+)"></script>', js, html)


def main():
    html = inline((ROOT / "index.html").read_text(encoding="utf-8"))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
