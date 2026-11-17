export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="skeleton h-4 w-56" />
      <div className="skeleton h-96 w-full rounded-2xl" />
      <div className="skeleton h-9 w-80" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]"><div className="skeleton h-96" /><div className="skeleton h-64" /></div>
    </div>
  );
}
