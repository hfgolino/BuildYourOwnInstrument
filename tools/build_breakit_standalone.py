#!/usr/bin/env python3
"""Inline docs/break-it/ into BreakItFixIt_Standalone.html (works from file://). A downloaded file cannot read
the Construct Lab progress saved on the website, and it cannot load pdf.js, so students load their Construct Lab
scale from the .txt version of their ticket, or use a standard scale."""
import os, re, base64
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = os.path.join(ROOT, "docs")
read = lambda *p: open(os.path.join(D, *p), encoding="utf-8").read()
h = read("break-it", "index.html")
h = h.replace('<link rel="stylesheet" href="../styles.css">', "<style>\n" + read("styles.css") + "\n</style>")
h = h.replace('<link rel="stylesheet" href="break.css">', "<style>\n" + read("break-it", "break.css") + "\n</style>")
for src, parts in (("data.js", ("break-it", "data.js")), ("../engine.js", ("engine.js",)), ("core.js", ("break-it", "core.js")), ("map.js", ("break-it", "map.js")), ("viz.js", ("break-it", "viz.js")), ("app.js", ("break-it", "app.js"))):
    h = h.replace(f'<script src="{src}"></script>', "<script>\n" + read(*parts).replace("</script", "<\\/script") + "\n</script>")
icon = base64.b64encode(open(os.path.join(D, "icons", "icon-192.png"), "rb").read()).decode()
h = h.replace('href="../icons/icon-192.png"', f'href="data:image/png;base64,{icon}"')
out = os.path.join(ROOT, "BreakItFixIt_Standalone.html"); open(out, "w", encoding="utf-8").write(h)
print("wrote", out, os.path.getsize(out) // 1024, "KB")
