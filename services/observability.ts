import * as Sentry from '@sentry/react';

type EventPayload = Record<string, string | number | boolean | null | undefined>;

const toData = (payload: EventPayload = {}) =>
  Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, v ?? null]));

export const logUiEvent = (name: string, payload: EventPayload = {}) => {
  Sentry.addBreadcrumb({
    category: 'ui',
    level: 'info',
    message: name,
    data: toData(payload),
  });
};

export const logUiError = (name: string, error: unknown, payload: EventPayload = {}) => {
  const asError = error instanceof Error ? error : new Error(typeof error === 'string' ? error : name);
  Sentry.captureException(asError, {
    tags: { area: 'ui', event: name },
    extra: toData(payload),
  });
};

