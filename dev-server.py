# Local dev server with the same clean-URL behaviour as Vercel (cleanUrls: true):
# /new-job serves new-job.html, / serves index.html. Run: python3 dev-server.py [port]
import os
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        p = super().translate_path(path)
        if not os.path.exists(p) and not os.path.splitext(p)[1]:
            html = p.rstrip("/\\") + ".html"
            if os.path.exists(html):
                return html
        return p


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    print("WeldCheck dev server on http://localhost:%d" % port)
    ThreadingHTTPServer(("", port), CleanUrlHandler).serve_forever()
