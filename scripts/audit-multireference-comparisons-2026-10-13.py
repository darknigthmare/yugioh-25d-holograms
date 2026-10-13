#!/usr/bin/env python3
"""Assemble labelled reference/before/after evidence from retained screenshots.

Model regions are lossless 300 x 300 pixel crops pasted without resizing or
retouching. Reference photographs/illustrations are letterboxed proportionally;
their complete original bytes and provenance remain separately retained.
Catalogue SVG portraits inside the original captures are explicitly distinct
from the two external source columns and never treated as official references.
"""
import argparse
import hashlib
import json
from pathlib import Path
import textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CELL = 300
HEADER = 82


def pin(path):
    return {'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline-dir', type=Path, required=True)
    parser.add_argument('--candidate-dir', type=Path, required=True)
    parser.add_argument('--references', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    reports = {phase: json.loads((folder / 'report.json').read_text())
        for phase, folder in [('before', args.baseline_dir), ('after', args.candidate_dir)]}
    assert all(r['ok'] for r in reports.values())
    config = json.loads(args.references.read_text())
    font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    font = ImageFont.truetype(font_path, 16)
    small = ImageFont.truetype(font_path, 13)
    result = {'scope': __doc__, 'driver': {'path': str(Path(__file__).relative_to(ROOT)), **pin(Path(__file__))},
        'referenceConfig': {'path': str(args.references), **pin(args.references)},
        'inputReports': {phase: {'path': str(folder / 'report.json'), **pin(folder / 'report.json')}
            for phase, folder in [('before', args.baseline_dir), ('after', args.candidate_dir)]},
        'groups': [], 'modelCrops': [], 'references': [], 'ok': False}

    def crop(phase, angle, key):
        report = reports[phase]
        for sheet in report['sets']:
            if sheet['phase'] != phase or sheet['angle'] != angle:
                continue
            for index, row in enumerate(sheet['measurements']):
                if row['key'] != key:
                    continue
                directory = args.baseline_dir if phase == 'before' else args.candidate_dir
                path = directory / f'{phase}-{sheet["name"]}.png'
                x, y = index % 5 * CELL, HEADER + index // 5 * CELL
                bounds = [x, y, x + CELL, y + CELL]
                image = Image.open(path).convert('RGB').crop(tuple(bounds))
                result['modelCrops'].append({'key': key, 'phase': phase, 'angle': angle,
                    'screenshot': {'path': str(path), **pin(path)}, 'cropBounds': bounds,
                    'resize': False, 'retouch': False, 'camera': row['camera']})
                return image
        raise AssertionError(('Model view absent', phase, angle, key))

    def reference(record):
        path = ROOT / record['file']
        original = Image.open(path).convert('RGBA')
        original.thumbnail((CELL - 16, CELL - 16), Image.Resampling.LANCZOS)
        frame = Image.new('RGB', (CELL, CELL), '#edf0f3')
        frame.paste(original, ((CELL - original.width) // 2, (CELL - original.height) // 2), original)
        result['references'].append({**record, **pin(path), 'display': 'complete image proportionally letterboxed'})
        return frame

    for group in config['groups']:
        canvas = Image.new('RGB', (CELL * 6, 62 + len(group['entries']) * 366), '#0e1927')
        draw = ImageDraw.Draw(canvas)
        draw.text((14, 10), group['title'], fill='#e7efff', font=font)
        for column, label in enumerate(['Source réelle A', 'Source réelle B', 'Avant · face',
                                        'Après · face', 'Avant · dos', 'Après · dos']):
            draw.text((column * CELL + 10, 35), label, fill='#9ddde5', font=small)
        for index, entry in enumerate(group['entries']):
            y = 62 + index * 366
            images = [reference(r) for r in entry['references']]
            assert len(images) == 2
            images += [crop(phase, angle, entry['key'])
                       for angle in ['front', 'back'] for phase in ['before', 'after']]
            for column, image in enumerate(images):
                canvas.paste(image, (column * CELL, y))
            label = entry['label'] + ' — ' + entry['note']
            for line_index, line in enumerate(textwrap.wrap(label, 220)):
                draw.text((12, y + CELL + 7 + line_index * 19), line, fill='#d5e0ef', font=small)
            for column, ref in enumerate(entry['references']):
                draw.text((column * CELL + 8, y + CELL - 20), ref['label'], fill='#101925', font=small,
                          stroke_width=2, stroke_fill='#ffffff')
        path = args.output / (group['id'] + '.png')
        canvas.save(path)
        result['groups'].append({'id': group['id'], 'modelCount': len(group['entries']),
            'artifact': {'path': str(path), **pin(path)}})
    result['ok'] = True
    (args.output / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'ok': True, 'groups': len(result['groups']),
        'models': sum(g['modelCount'] for g in result['groups']),
        'modelCrops': len(result['modelCrops']), 'sourceImages': len(result['references'])}), flush=True)


if __name__ == '__main__':
    main()
