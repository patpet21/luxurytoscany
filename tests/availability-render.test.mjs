import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adapt, render} from '../src/render.mjs';
import {CATALOGUE} from '../public/assets/availability-model.js';

test('all eleven villa pages retain gallery, enquiry, legacy calendar and correct source mapping', () => {
  const source=JSON.parse(fs.readFileSync(new URL('../content/source.json',import.meta.url)));
  const pages=adapt(source), villas=pages.filter(p=>p.path.startsWith('/properties/'));
  assert.equal(villas.length,11);
  for(const page of villas) {
    const html=render(page,pages,source), entry=CATALOGUE.find(v=>v.path===page.path);
    assert.ok(html.includes(`data-availability="${entry?.slug || 'unverified'}"`),page.title);
    assert.equal((html.match(/id="availability-title"/g)||[]).length,1);
    assert.ok(html.includes('id="gallery-data"'),page.title);
    assert.ok(html.includes('name="stay-request"') && html.includes('name="information-request"'),page.title);
    assert.ok(html.includes('name="availability-check" value="unverified"'),page.title);
    assert.ok(html.includes('Original calendar reference'),page.title);
    assert.ok(html.includes('/assets/availability.js?v='),page.title);
    assert.ok(!html.includes('Book now'),page.title);
    if(!entry) assert.ok(html.includes('Availability for this villa has not been verified'));
  }
});
