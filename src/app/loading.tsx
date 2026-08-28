export default function Loading() {
  return (
    <div aria-label="Loading School HQ" className="space-y-5 animate-pulse">
      <div className="h-20 max-w-xl rounded-2xl bg-card-strong" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-64 rounded-2xl bg-card-strong" />
        <div className="h-64 rounded-2xl bg-card-strong" />
      </div>
    </div>
  );
}
