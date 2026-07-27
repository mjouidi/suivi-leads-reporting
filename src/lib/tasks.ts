export type Gender = 'f' | 'm';

export const FIELD_KEYS = ['new', 'nrs', 'interested', 'warm', 'explication'] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const EXTRA_KEYS = [
  'interested_this_month',
  'interested_previous_month',
  'contact_future',
  'not_answered',
  'offer_sent_this_month',
  'offer_sent_previous_month',
  'negotiation',
  'offer_accepted',
] as const;
export type ExtraKey = (typeof EXTRA_KEYS)[number];

export type TaskKey = FieldKey | ExtraKey;

export const ALL_TASK_KEYS: readonly TaskKey[] = [...FIELD_KEYS, ...EXTRA_KEYS];

export const FIELD_LABELS: Record<FieldKey, string> = {
  new: 'New',
  nrs: 'NRs',
  interested: 'Interested',
  warm: 'Warm leads',
  explication: 'Explication',
};

export const EXTRA_LABELS: Record<ExtraKey, string> = {
  interested_this_month: 'Interested – This Month',
  interested_previous_month: 'Interested – Previous Month',
  contact_future: 'Contact – In the Future',
  not_answered: 'Not Answered',
  offer_sent_this_month: 'Offer Sent – This Month',
  offer_sent_previous_month: 'Offer Sent – Previous Month',
  negotiation: 'Negotiation',
  offer_accepted: 'Offer Accepted',
};

export function taskLabel(key: TaskKey): string {
  return (FIELD_LABELS as Record<string, string>)[key] ?? (EXTRA_LABELS as Record<string, string>)[key] ?? key;
}
