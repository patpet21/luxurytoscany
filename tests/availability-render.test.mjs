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
    assert.ok(html.includes('/assets/stay-controls.css?v='),page.title);
    assert.match(html, /name="arrival" type="text" readonly/);
    assert.match(html, /name="departure" type="text" readonly/);
    assert.ok(!/name="(?:arrival|departure)" type="date"/.test(html));
    assert.equal((html.match(/id="stay-calendar-dialog"/g)||[]).length,1);
    assert.ok(!html.includes('Book now'),page.title);
    if(!entry) assert.ok(html.includes('Availability for this villa has not been verified'));
  }
});

test('reused finder includes All villas and one shared selected-villa calendar in home and listing',()=>{
  const source=JSON.parse(fs.readFileSync(new URL('../content/source.json',import.meta.url)));
  const pages=adapt(source);
  for(const path of ['/','/tuscany-villas-for-rent']) {
    const html=render(pages.find(p=>p.path===path),pages,source);
    assert.ok(html.includes('id="home-villa"'));
    assert.ok(html.includes('All villas'));
    assert.equal((html.match(/data-availability="finder"/g)||[]).length,1);
    assert.ok(html.includes('type="date" id="home-arrival"'));
  }
});
