// useDocumentViewMode deprecated — accordion removed. Provide a stable stub returning 'table'.
export default function useDocumentViewMode() {
  const setViewMode = (_: 'table' | 'accordion') => {};
  return ['table', setViewMode] as const;
}
