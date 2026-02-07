export const appEnv = () => {
  const fromEnv = import.meta.env.VITE_APP_ENV as string | undefined;
  if (fromEnv) return fromEnv;
  return import.meta.env.PROD ? 'production' : 'preview';
};

export const appVersion = () => {
  const v = import.meta.env.VITE_APP_VERSION as string | undefined;
  return (v ?? '').trim() || 'dev';
};

