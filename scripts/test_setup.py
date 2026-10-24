"""Offline checks: python3 -m unittest discover -s scripts -p 'test_*.py'."""
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import setup


class SetupTests(unittest.TestCase):
    def test_download_cache_and_generated_config(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'dependencies.json').write_text(json.dumps({'libraries': [{'name': 'Test', 'version': '1', 'file': 'test.js', 'url': 'https://example.com/test.js'}]}))
            (root / 'supabase.config.example.json').write_text('{"url":"", "publishableKey":""}')
            (root / 'index.html').write_text('<head></head><body>Original</body>')
            with patch.object(setup, 'ROOT', root), patch.object(setup.urllib.request, 'urlopen', return_value=io.BytesIO(b'/* library */' * 20)) as download:
                setup.setup()
                setup.setup()
                self.assertEqual(download.call_count, 1)
                self.assertIn('Original', (root / 'index.local.html').read_text())
                (root / 'index.html').write_text('<head></head><body>Updated</body>')
                setup.setup()
                self.assertIn('Updated', (root / 'index.local.html').read_text())
                (root / 'supabase.config.local.json').write_text('{"url":"https://example.supabase.co", "publishableKey":"sb_secret_no"}')
                with self.assertRaisesRegex(ValueError, 'never a secret'):
                    setup.setup()

    def test_download_failure_leaves_existing_library(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'vendor').mkdir()
            target = root / 'vendor/test.js'
            target.write_text('existing library')
            (root / 'dependencies.json').write_text(json.dumps({'libraries': [{'name': 'Test', 'version': '2', 'file': 'test.js', 'url': 'https://example.com/test.js'}]}))
            with patch.object(setup, 'ROOT', root), patch.object(setup.urllib.request, 'urlopen', side_effect=OSError('DNS unavailable')):
                with self.assertRaises(OSError):
                    setup.setup()
            self.assertEqual(target.read_text(), 'existing library')

    def test_env_precedence_and_public_allowlist(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '.env').write_text('# comment\nexport SUPABASE_URL="https://env.supabase.co" # comment\nSUPABASE_PUBLISHABLE_KEY=sb_publishable_test\nPRIVATE_TOKEN=do-not-export\n')
            (root / 'supabase.config.local.json').write_text('{"url":"https://old.supabase.co", "publishableKey":"sb_publishable_old"}')
            (root / 'dependencies.json').write_text('{"libraries": []}')
            (root / 'index.html').write_text('<head></head>')
            with patch.object(setup, 'ROOT', root), patch.dict(setup.os.environ, {}, clear=True):
                self.assertEqual(setup.load_config(), ('https://env.supabase.co', 'sb_publishable_test'))
                with patch.dict(setup.os.environ, {'SUPABASE_URL': 'https://shell.supabase.co'}):
                    self.assertEqual(setup.load_config()[0], 'https://shell.supabase.co')
                setup.setup()
                self.assertNotIn('do-not-export', (root / 'index.local.html').read_text())

    def test_env_malformed_and_partial_config(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(setup, 'ROOT', root), patch.dict(setup.os.environ, {}, clear=True):
                (root / '.env').write_text('SUPABASE_URL=https://test.supabase.co\n')
                with self.assertRaisesRegex(ValueError, 'both'):
                    setup.load_config()
                (root / '.env').write_text('SUPABASE_URL="unterminated\n')
                with self.assertRaisesRegex(ValueError, 'quotes'):
                    setup.load_config()

    def test_next_public_aliases(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            env = root / '.env'
            env.write_text('NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test\n')
            with patch.object(setup, 'ROOT', root), patch.dict(setup.os.environ, {}, clear=True):
                self.assertEqual(setup.load_config(), ('https://test.supabase.co', 'sb_publishable_test'))
                with patch.dict(setup.os.environ, {'SUPABASE_URL': 'https://shell.supabase.co'}):
                    self.assertEqual(setup.load_config()[0], 'https://shell.supabase.co')
                env.write_text(env.read_text() + 'SUPABASE_URL=https://different.supabase.co\n')
                with self.assertRaisesRegex(ValueError, 'Conflicting'):
                    setup.load_config()

    def test_server_blocks_config_files(self):
        import start
        from unittest.mock import Mock
        handler = object.__new__(start.AppHandler)
        handler.send_error = Mock()
        for name in ['.env', '.git/config', 'supabase.config.local.json']:
            handler.path = '/' + name
            handler.translate_path = Mock(return_value=str(start.ROOT / name))
            self.assertIsNone(handler.send_head())
            handler.send_error.assert_called_with(404)


if __name__ == '__main__':
    unittest.main()
