export default function AdminLoading() {
  return (
    <main
      aria-busy="true"
      className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10"
    >
      <p className="rounded-xl bg-white px-5 py-4 text-slate-700 shadow-sm">Carregando o painel…</p>
    </main>
  );
}
