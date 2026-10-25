"""Serve the built app (public/) for hosting on kuso, on 0.0.0.0:$PORT."""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        # The platform's health check fetches / and hangs up before the 2 MB page is sent.
        # That is normal, so skip the traceback; anything else is still reported.
        if isinstance(sys.exc_info()[1], (ConnectionResetError, BrokenPipeError)):
            return
        super().handle_error(request, client_address)


def main():
    port = int(os.environ.get('PORT', '8080'))
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT / 'public'))
    with Server(('0.0.0.0', port), handler) as server:
        print(f'Serving ChillCheck on port {port}', flush=True)
        server.serve_forever()


if __name__ == '__main__':
    main()
