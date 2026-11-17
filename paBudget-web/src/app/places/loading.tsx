export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-72 w-full" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-64" />)}</div>
    </div>
  );
}
