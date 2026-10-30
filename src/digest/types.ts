export type RunStatus = 'ok' | 'retry' | 'fail';

export const RUN_STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  // Error of the latest line that carried one, even if the job later succeeded.
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type StatusCounts = Record<RunStatus, number>;

export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
  counts: StatusCounts;
};

// null: no runs/<night>.jsonl on disk. An empty file is a Night with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
