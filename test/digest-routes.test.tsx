import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const NIGHT = '2026-10-29';
const GOOD_LINES = [
  '{"at":"2026-10-29T01:30:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
  '{"at":"2026-10-29T01:37:00+01:00","job":"fixtures/refresh","status":"ok","owner":"rook"}',
  '{"at":"2026-10-29T02:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
  '{"at":"2026-10-29T03:00:00+01:00","job":"notes/backup","status":"fail","owner":"mira","error":"quota exceeded"}',
];

function runsWith(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

function appFor(runsDir: string) {
  return createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });
}

describe('digest page', () => {
  it('renders a night with rows as 200', async () => {
    const app = appFor(runsWith({ [`${NIGHT}.jsonl`]: GOOD_LINES.join('\n') + '\n' }));
    const res = await app.request(`/digest/${NIGHT}`);
    expect(res.status).toBe(200);
  });

  it('lists every job in the same order as the JSON rows', async () => {
    const app = appFor(runsWith({ [`${NIGHT}.jsonl`]: GOOD_LINES.join('\n') + '\n' }));
    const html = await (await app.request(`/digest/${NIGHT}`)).text();
    const positions = ['fixtures/refresh', 'lane/sync', 'notes/backup'].map((job) => html.indexOf(job));
    expect(positions.every((pos) => pos >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('answers 404 for a night with no file', async () => {
    const app = appFor(runsWith({}));
    const res = await app.request(`/digest/${NIGHT}`);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain(`no run log for ${NIGHT}`);
  });

  it('shows the empty state for an empty night', async () => {
    const app = appFor(runsWith({ [`${NIGHT}.jsonl`]: '' }));
    const res = await app.request(`/digest/${NIGHT}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('keeps the good rows and reports the bad line', async () => {
    const app = appFor(runsWith({ [`${NIGHT}.jsonl`]: [GOOD_LINES[0], 'not json', GOOD_LINES[2]].join('\n') + '\n' }));
    const res = await app.request(`/digest/${NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('fixtures/refresh');
    expect(html).toContain('lane/sync');
    expect(html).toContain('1 line did not parse');
  });
});

describe('digest JSON', () => {
  it('answers 200 with the night object for a night with rows', async () => {
    const app = appFor(runsWith({ [`${NIGHT}.jsonl`]: GOOD_LINES.join('\n') + '\n' }));
    const res = await app.request(`/api/digest/${NIGHT}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      night: NIGHT,
      badLines: 0,
      counts: { ok: 2, retry: 1, fail: 1 },
    });
    expect((body as { rows: { job: string }[] }).rows.map((row) => row.job)).toEqual([
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
    ]);
  });

  it('answers 404 with an error body for a night with no file', async () => {
    const app = appFor(runsWith({}));
    const res = await app.request(`/api/digest/${NIGHT}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: `no run log for ${NIGHT}` });
  });

  it('returns no rows for an empty night', async () => {
    const app = appFor(runsWith({ [`${NIGHT}.jsonl`]: '' }));
    const res = await app.request(`/api/digest/${NIGHT}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ night: NIGHT, rows: [], badLines: 0 });
  });

  it('counts the bad line and keeps the good rows', async () => {
    const app = appFor(runsWith({ [`${NIGHT}.jsonl`]: [GOOD_LINES[0], 'not json', GOOD_LINES[2]].join('\n') + '\n' }));
    const res = await app.request(`/api/digest/${NIGHT}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { badLines: number; rows: { job: string }[] };
    expect(body.badLines).toBe(1);
    expect(body.rows.map((row) => row.job)).toEqual(['fixtures/refresh', 'lane/sync']);
  });
});
