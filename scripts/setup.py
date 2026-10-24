"""Download pinned browser dependencies without npm or pip."""
import argparse
import json
import os
from pathlib import Path
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def read_env(path):
    """Read simple KEY=value lines; never execute or expand shell expressions."""
    values = {}
    if not path.exists():
        return values
    for number, raw in enumerate(path.read_text().splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('export '):
            line = line[7:].strip()
        name, separator, value = line.partition('=')
        if not separator or not name.strip().isidentifier():
            raise ValueError(f'Invalid .env assignment on line {number}')
        value = value.strip()
        if value.startswith(('"', "'")):
            quote = value[0]
            end = value.find(quote, 1)
            if end < 0 or (value[end + 1:].strip() and not value[end + 1:].strip().startswith('#')):
                raise ValueError(f'Invalid .env quotes on line {number}')
            value = value[1:end]
        else:
            value = value.split(' #', 1)[0].rstrip()
        values[name.strip()] = value
    return values


def load_config():
    path = ROOT / 'supabase.config.local.json'
    config = json.loads(path.read_text()) if path.exists() else {}
    env = read_env(ROOT / '.env')
    # Only these public values may enter the generated browser page.
    aliases = {
        'url': ('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
        'publishableKey': ('SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    }
    for field, names in aliases.items():
        for source in (os.environ, env):
            present = [name for name in names if name in source]
            if present:
                if len({source[name] for name in present}) > 1:
                    raise ValueError(f'Conflicting Supabase configuration aliases: {", ".join(present)}')
                config[field] = source[present[0]]
                break
    url, key = config.get('url', ''), config.get('publishableKey', '')
    if bool(url) != bool(key):
        raise ValueError('Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, or leave both empty for demo mode.')
    if key and not key.startswith('sb_publishable_'):
        raise ValueError('Use a Supabase sb_publishable_ key, never a secret/service-role key.')
    if url and not url.startswith('https://'):
        raise ValueError('Use the HTTPS project URL from your hosted Supabase project.')
    return url, key


def setup(refresh=False):
    url, key = load_config()
    libraries = json.loads((ROOT / 'dependencies.json').read_text())['libraries']
    vendor = ROOT / 'vendor'
    vendor.mkdir(exist_ok=True)
    for lib in libraries:
        target = vendor / lib['file']
        marker = target.with_suffix(target.suffix + '.version')
        if not refresh and target.exists() and target.stat().st_size > 0 and marker.exists() and marker.read_text() == lib['version']:
            print(f"Ready: {lib['name']} {lib['version']}")
            continue
        print(f"Downloading {lib['name']} {lib['version']}...", flush=True)
        request = urllib.request.Request(lib['url'], headers={'User-Agent': 'ChillCheck-Setup/1.0'})
        with urllib.request.urlopen(request, timeout=30) as response:
            content = response.read()
        if len(content) < 100 or content.lstrip().lower().startswith((b'<!doctype html', b'<html')):
            raise RuntimeError(f"Unexpected download for {lib['name']}")
        temporary = target.with_suffix(target.suffix + '.tmp')
        temporary.write_bytes(content)
        temporary.replace(target)
        marker.write_text(lib['version'])

    # Generate a configured entry point without putting .env in the browser. This generated
    # page uses local libraries, and is recreated from current sources each run.
    html = (ROOT / 'index.html').read_text()
    html = html.replace('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', 'vendor/qrcode.min.js')
    public_config = json.dumps({'url': url, 'publishableKey': key}).replace('<', '\u003c')
    scripts = ('<script src="vendor/supabase.js"></script>\n'
               '<script>\nconst backendConfig = ' + public_config + ';\n'
               'window.ChillCheckBackend = backendConfig.url ? '
               'supabase.createClient(backendConfig.url, backendConfig.publishableKey) : null;\n'
               '</script>\n')
    html = html.replace('</head>', scripts + '</head>')
    (ROOT / 'index.local.html').write_text(html)
    print('Supabase client configured.' if url else 'Demo mode: add your project URL and publishable key to .env when ready.')
    print('Setup complete. React app uses Supabase Auth and database storage.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true', help='Download libraries again')
    args = parser.parse_args()
    try:
        setup(args.refresh)
    except Exception as exc:
        print(f'Setup failed: {exc}\nCheck internet access to cdn.jsdelivr.net and cdnjs.cloudflare.com, then retry. No npm is needed.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
