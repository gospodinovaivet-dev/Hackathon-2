"""Install browser dependencies if needed and serve ChillCheck locally."""
import argparse
import json
import socket
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import sys
from pathlib import Path
import webbrowser
from setup import ROOT, setup



def wifi_address():
    """This computer's address on the local network, which a phone on the same Wi-Fi can reach."""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        try:
            probe.connect(('192.0.2.1', 80))   # no packet is sent; this only picks the network interface
            return probe.getsockname()[0]
        except OSError:
            return None


class AppServer(ThreadingHTTPServer):
    # The browser asks for ~20 files at once. Python's default queue holds only 5 waiting
    # connections, and on Windows the rest are refused, so app.js or a photo sometimes never loaded.
    request_queue_size = 128
    daemon_threads = True


class AppHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        # The phone QR asks for this computer's Wi-Fi address and port
        if self.path == '/phone-url.json':
            ip = wifi_address()
            body = json.dumps({'url': f'http://{ip}:{self.server.server_address[1]}/index.local.html' if ip else None}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def send_head(self):
        if self.path.split("?", 1)[0] in ("/", "/index.html"):
            self.path = "/index.local.html"
        target = Path(self.translate_path(self.path)).resolve()
        try:
            parts = target.relative_to(ROOT).parts
        except ValueError:
            self.send_error(404)
            return None
        if any(part.startswith('.') for part in parts) or target.name == 'supabase.config.local.json':
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='0.0.0.0', help='0.0.0.0 lets a phone on the same Wi-Fi open the app; use 127.0.0.1 to allow this computer only')
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    try:
        setup()
        handler = partial(AppHandler, directory=str(ROOT))
        with AppServer((args.host, args.port), handler) as server:
            url = f'http://127.0.0.1:{args.port}/index.local.html'
            print(f'ChillCheck: {url}\nPress Ctrl+C to stop.', flush=True)
            if not args.no_browser:
                webbrowser.open(url)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                print('\nStopped.')
    except Exception as exc:
        print(f'Could not start: {exc}\nIf the port is busy, use --port 8081. For downloads, check your internet connection and retry.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
