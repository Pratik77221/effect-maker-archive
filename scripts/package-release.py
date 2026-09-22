"""Create a deterministic, installable extension ZIP using Python's standard library."""
from hashlib import sha256
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
extension = root / 'extension'
version = json.loads((extension / 'manifest.json').read_text())['version']
package_version = json.loads((root / 'package.json').read_text())['version']
if version != package_version:
    raise SystemExit('Manifest and package versions must match.')

files = {}
for path in sorted(extension.rglob('*')):
    if path.is_symlink():
        raise SystemExit('Refusing symlink: ' + str(path))
    if path.is_file():
        if path.name == '.effect-maker-archive-update-backup.json':
            continue
        name = path.relative_to(extension).as_posix()
        if path.suffix not in {'.js', '.json', '.html', '.css', '.png', '.svg'}:
            raise SystemExit('Unexpected extension file: ' + name)
        files[name] = path.read_bytes()
documentation_url = 'https://github.com/Pratik77221/effect-maker-archive/blob/main/'
privacy = (root / 'PRIVACY.md').read_text()
privacy = privacy.replace('](docs/PERMISSIONS.md)', '](' + documentation_url + 'docs/PERMISSIONS.md)')
installation = (root / 'docs' / 'SETUP.md').read_text()
for page in ['GITHUB.md', 'TROUBLESHOOTING.md', 'UPDATES.md']:
    installation = installation.replace('](' + page + ')', '](' + documentation_url + 'docs/' + page + ')')
installation = installation.replace('](../PRIVACY.md)', '](PRIVACY.md)')
files['PRIVACY.md'] = privacy.encode('utf-8')
files['INSTALL.md'] = installation.encode('utf-8')

output = root / 'dist'
output.mkdir(exist_ok=True)
archive = output / ('effect-maker-archive-v' + version + '.zip')
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as bundle:
    for name, data in sorted(files.items()):
        entry = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        bundle.writestr(entry, data, compress_type=ZIP_DEFLATED, compresslevel=9)
with ZipFile(archive) as bundle:
    if bundle.testzip() is not None or set(bundle.namelist()) != set(files):
        raise SystemExit('ZIP verification failed.')
    for name, data in files.items():
        if bundle.read(name) != data:
            raise SystemExit('Packaged file differs: ' + name)

checksum = sha256(archive.read_bytes()).hexdigest()
(output / 'SHA256SUMS.txt').write_text(checksum + '  ' + archive.name + '\n')
print(str(archive))
print(str(len(files)) + ' files; SHA-256 ' + checksum)
