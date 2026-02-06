const escapeCsvCell = (value: unknown) => {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');

export const downloadText = (args: { filename: string; content: string; mime?: string }) => {
  const blob = new Blob([args.content], { type: args.mime ?? 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = args.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

