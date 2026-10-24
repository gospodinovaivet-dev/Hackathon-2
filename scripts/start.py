"""Install browser dependencies if needed and serve ChillCheck locally."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import sys
from pathlib import Path
import webbrowser
from setup import ROOT, setup


class AppHandler(SimpleHTTPRequestHandler):
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
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    try:
        setup()
        handler = partial(AppHandler, directory=str(ROOT))
        with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
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
