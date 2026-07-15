export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-white" role="status">
      <div className="flex flex-col items-center">
        <span className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950" />
        <p className="mt-4 text-sm font-medium text-zinc-600">Carregando...</p>
      </div>
    </main>
  );
}
