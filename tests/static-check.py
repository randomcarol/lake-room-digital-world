"""Validate published references, JSON fields and fail-closed public content boundary."""
import json, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'room-preview'
data=json.loads((root/'content.json').read_text())
for key in ('notebookPages','tracks','photos','travelPins','books'):
    assert isinstance(data[key],list),key
for pin in data['travelPins']:
    assert 0<=pin['x']<=1 and 0<=pin['y']<=1
for file in ('index.html','room.js','interactions.js','content-store.js','experiences.js'):
    assert 'localStorage' not in re.sub(r'/\*.*?\*/','',(root/file).read_text(),flags=re.S),file
for path in re.findall(r'(?:src|href)="([^"]+)"',(root/'index.html').read_text()):
    if path.startswith('data:'):continue
    assert (root/path).exists(),path
for path in root.glob('models/*/model.gltf'):
    doc=json.loads(path.read_text())
    for entry in doc.get('buffers',[])+doc.get('images',[]):
        uri=entry.get('uri','')
        if uri and not uri.startswith('data:'):
            assert (path.parent/uri).exists(),str(path)+': '+uri
admin=(root/'admin/index.html').read_text()
assert not re.search(r'<(?:input|textarea|form)\b',admin)
print('PASS JSON schema basics, public read-only boundary, local scripts, all model dependencies, fail-closed admin')
