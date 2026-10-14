/** Every slide partial, as raw HTML strings keyed by path. Sorted by file name in the loader. */
export const partials: Record<string, string> = import.meta.glob('./slides/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});
