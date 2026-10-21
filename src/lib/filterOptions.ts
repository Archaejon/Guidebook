import { CLAIM_STATUSES, DOC_STATUSES, EXPERIMENT_STATUSES, METHOD_STATUSES, READING_STATUSES } from '../types';

export const STATUS_OPTIONS = Array.from(
  new Set<string>([
    ...METHOD_STATUSES,
    ...DOC_STATUSES,
    ...READING_STATUSES,
    ...CLAIM_STATUSES,
    ...EXPERIMENT_STATUSES,
  ]),
).sort();

export const READ_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'year', label: 'Last year' },
];
