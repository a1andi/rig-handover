import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RUN_STATUSES, type DigestRow, type ReadNight, type RunLine, type RunStatus } from './types.js';

function isRunStatus(value: unknown): value is RunStatus {
  return RUN_STATUSES.some((status) => status === value);
}

function parseLine(text: string): RunLine | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { at, job, status, owner, error } = value as Record<string, unknown>;
  if (typeof at !== 'string' || typeof job !== 'string' || !isRunStatus(status)) return null;
  return {
    at,
    job,
    status,
    owner: typeof owner === 'string' ? owner : null,
    ...(typeof error === 'string' ? { error } : {}),
  };
}

function readText(file: string): string | null {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function addLine(row: DigestRow | undefined, line: RunLine): DigestRow {
  const retry = line.status === 'retry' ? 1 : 0;
  if (!row) {
    return {
      job: line.job,
      owner: line.owner,
      runs: 1,
      retries: retry,
      lastStatus: line.status,
      lastError: line.error ?? null,
      firstAt: line.at,
      lastAt: line.at,
    };
  }
  return {
    ...row,
    owner: line.owner ?? row.owner,
    runs: row.runs + 1,
    retries: row.retries + retry,
    lastStatus: line.status,
    lastError: line.error ?? row.lastError,
    lastAt: line.at,
  };
}

const byJob = (a: DigestRow, b: DigestRow) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0);

export const readNight: ReadNight = (runsDir, night) => {
  const text = readText(join(runsDir, `${night}.jsonl`));
  if (text === null) return null;

  const rows = new Map<string, DigestRow>();
  const counts = { ok: 0, retry: 0, fail: 0 };
  let badLines = 0;

  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (!line) {
      badLines++;
      continue;
    }
    counts[line.status]++;
    rows.set(line.job, addLine(rows.get(line.job), line));
  }

  return { night, rows: [...rows.values()].sort(byJob), badLines, counts };
};
