"""Explicit, read-only public-source audit; never part of build or CI.

Requires Python 3 and curl. Captures API responses, public calendar day colours,
and the supplier client's disabled-dates binding. No credentials or cookies.
"""
import concurrent.futures
import datetime
import html
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'https://www.promozionevilla.it/'
VILLAS = [(1081, 'Palazzo Rosadi'), (5054, 'Villa Casciano'), (336, 'Villa De’ Michelangioli'),
          (1811, 'Villa dell’Angelo'), (5359, 'Villa Ginestra'), (5358, 'Villa Girasole'),
          (5158, 'Villa Guardistallo'), (1813, 'Villa Roncovisi'), (1335, 'Villa Torre del Cielo'), (6630, 'Villa Volterra')]

def get(url, data=None):
    args = ['curl.exe', '-L', '-sS', '--max-time', '25', '-w', '\n%{http_code}', url]
    for key, value in (data or {}).items():
        args.extend(['--data-urlencode', f'{key}={value}'])
    result = subprocess.run(args, capture_output=True, encoding='utf-8', check=True)
    body, _, status = result.stdout.rpartition('\n')
    if status != '200':
        raise ValueError(f'{url}: HTTP {status}')
    return body

def key(value):
    return re.sub('[^a-z0-9]', '', value.lower())

def parse_calendar(source):
    result = {}
    for row in source.split('<div class="wpbs-calendar wpbs-overview-row">')[1:]:
        name = html.unescape(re.sub('<[^>]+>', '', re.search(r'wpbs-overview-row-header-inner">(.*?)</div>', row)[1]))
        if key(name) not in {key(n) for _, n in VILLAS}:
            continue
        days = {}
        for y, m, d, legend in re.findall(r'data-year="(\d+)" data-month="(\d+)" data-day="(\d+)"><div class="wpbs-legend-item-icon wpbs-legend-item-icon-(\d+)"', row):
            colours = re.findall(r'wpbs-legend-item-icon-'+legend+r' div:(?:first-of-type|nth-of-type\(2\)) \{ background-color: ([^;]+);', source)
            state = 'blocked' if colours == ['#ffc0bd', 'transparent'] else 'source-available' if colours == ['#ddffcc', 'transparent'] else 'unknown'
            days[f'{int(y):04}-{int(m):02}-{int(d):02}'] = state
        result[key(name)] = days
    if len(result) != 10:
        raise ValueError('Calendar did not contain all ten named villas')
    return result

if __name__ == '__main__':
    overview = get(BASE+'availability/')
    current = parse_calendar(overview)
    attrs = dict(re.findall(r'data-([a-z_]+)="([^"]*)"', re.search(r'<div class="wpbs-overview-container"[^>]+>', overview)[0]))
    # The public month selector uses this read-only AJAX action via POST.
    # Keep the same exposed data attributes and request a representative July.
    year = datetime.date.today().year + 1
    attrs.update(action='wpbs_refresh_calendar_overview', current_year=str(year), current_month='7')
    future = parse_calendar(get(BASE+'wp-admin/admin-ajax.php', attrs))
    client = get(BASE+'wp-content/plugins/villa-availabilities/app/dist/app.js')
    if '"disabled-dates":n.value' not in client or 'n.value=c[0].availabilities' not in client:
        raise ValueError('Supplier client binding changed: re-audit semantics')
    def collect(villa):
        identifier, name = villa
        url = BASE+f'wp-json/promovilla/v1/availabilities/{identifier}'
        payload = json.loads(get(url))
        if len(payload) != 1 or payload[0]['id'] != identifier or key(payload[0]['title']) != key(name):
            raise ValueError('Identity mismatch')
        ranges = [(datetime.datetime.strptime(i['start'], '%m/%d/%Y').date().isoformat(), datetime.datetime.strptime(i['end'], '%m/%d/%Y').date().isoformat()) for i in payload[0]['availabilities']]
        comparisons = []
        for calendar in (current[key(name)], future[key(name)]):
            for date, state in calendar.items():
                api_blocked = any(start <= date <= end for start, end in ranges)
                comparisons.append({'date':date, 'public':state, 'apiBlocked':api_blocked})
        # Past dates can have been pruned from the API. Any disagreement is
        # recorded rather than interpreted as permission to book.
        mismatches = [d for d in comparisons if d['apiBlocked'] != (d['public']=='blocked')]
        print(f'{name}: {len(ranges)} intervals; {len(comparisons)} public days compared; {len(mismatches)} differences', flush=True)
        return {'id':identifier, 'name':name, 'url':url, 'payload':payload, 'publicDays':comparisons, 'differences':mismatches}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        villas = list(pool.map(collect, VILLAS))
    evidence = {'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'calendar':BASE+'availability/',
                'client':BASE+'wp-content/plugins/villa-availabilities/app/dist/app.js',
                'clientBinding':'API availabilities are passed to v-calendar disabled-dates',
                'semantics':'Blocked calendar dates, start and end inclusive. Arrival/departure times are not supplied.', 'villas':villas}
    output = ROOT/'tests/fixtures/availability-source.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
