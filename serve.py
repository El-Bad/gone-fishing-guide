"""Serve the field guide locally with live GONE Fishing profile data.

gonefishing.gg's API doesn't send CORS headers, so a browser page can't call it from another origin.
This server serves the guide and forwards a small allow-list of read-only API calls (including the
live catch stream) under /gf-api/, so the Player tab updates live.

    python serve.py            -> http://127.0.0.1:8765/
    python serve.py 9000       -> another port
"""
import http.server, socketserver, sys, urllib.error, urllib.request, webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
UPSTREAM = "https://gonefishing.gg/api/"
ALLOW = ("player/", "liveview/recent", "seasons", "challenges")  # read-only endpoints the guide uses
UA = "Mozilla/5.0 (GONE Fishing field guide; local viewer)"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):
        if "/gf-api/liveview/recent/stream" not in (str(args[0]) if args else ""):
            sys.stderr.write("  " + fmt % args + "\n")

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self.send_response(302); self.send_header("Location", "/GONE-Fishing-Field-Guide.html"); self.end_headers(); return
        if not self.path.startswith("/gf-api/"):
            return super().do_GET()
        rest = self.path[len("/gf-api/"):]
        if not rest.startswith(ALLOW) or ".." in rest:
            self.send_error(403, "Not an allowed API path"); return
        stream = rest.startswith("liveview/recent/stream")
        req = urllib.request.Request(UPSTREAM + rest, headers={"User-Agent": UA, "Accept": "text/event-stream" if stream else "application/json"})
        try:
            up = urllib.request.urlopen(req, timeout=None if stream else 30)
        except urllib.error.HTTPError as e:
            self.send_response(e.code); self.send_header("Content-Type", "application/json"); self.end_headers()
            self.wfile.write(e.read()); return
        except Exception as e:
            self.send_error(502, f"Upstream error: {e}"); return
        self.send_response(up.status)
        self.send_header("Content-Type", up.headers.get("Content-Type", "application/json"))
        self.send_header("Cache-Control", "no-store")
        if stream:
            self.send_header("X-Accel-Buffering", "no"); self.end_headers()
            try:
                while True:
                    chunk = up.read1(4096) if hasattr(up, "read1") else up.read(1)
                    if not chunk:
                        break
                    self.wfile.write(chunk); self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass
            finally:
                up.close()
        else:
            body = up.read(); up.close()
            self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    url = f"http://127.0.0.1:{PORT}/GONE-Fishing-Field-Guide.html#player"
    print(f"GONE Fishing field guide with live data: {url}\nCtrl+C to stop.")
    with Server(("127.0.0.1", PORT), Handler) as srv:
        if "--no-browser" not in sys.argv:
            webbrowser.open(url)
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass
