"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
        <h1 className="text-2xl font-semibold text-slate-950">
          Não foi possível carregar o painel
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Tente novamente. Se o problema continuar, fale com o mantenedor.
        </p>
        <button
          className="mt-6 rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white focus:outline-none focus:ring-4 focus:ring-indigo-600"
          onClick={reset}
          type="button"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
