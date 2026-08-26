export default function StoreNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200">
        <h1 className="text-2xl font-semibold text-slate-950">Loja não encontrada</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Confira o link ou fale com a revendedora para obter o endereço correto.
        </p>
      </section>
    </main>
  );
}
