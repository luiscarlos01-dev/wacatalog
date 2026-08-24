"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { authCopy } from "@/features/auth/auth-copy";
import { signIn } from "@/features/auth/sign-in";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginErrors = Partial<Record<keyof LoginInput, string>>;

export function validateLoginInput(input: LoginInput): LoginErrors {
  const errors: LoginErrors = {};
  const email = input.email.trim();

  if (!email || !email.includes("@")) {
    errors.email = "Informe um email válido.";
  }

  if (!input.password) {
    errors.password = "Informe sua senha.";
  }

  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useIsHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateLoginInput({ email, password });
    setErrors(nextErrors);
    setFormError(undefined);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email.trim(), password);

    if (!result.ok) {
      setFormError(
        result.code === "service_unavailable"
          ? authCopy.serviceUnavailable
          : authCopy.invalidCredentials,
      );
      setIsSubmitting(false);
      return;
    }

    router.push("/admin");
  }

  return (
    <form className="space-y-5" method="post" onSubmit={handleSubmit} noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="email">
          Email
        </label>
        <input
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
        {errors.email ? (
          <p className="mt-2 text-sm text-red-700" id="email-error" role="alert">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="password">
          Senha
        </label>
        <input
          aria-describedby={errors.password ? "password-error" : undefined}
          aria-invalid={Boolean(errors.password)}
          autoComplete="current-password"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        {errors.password ? (
          <p className="mt-2 text-sm text-red-700" id="password-error" role="alert">
            {errors.password}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {formError}
        </p>
      ) : null}

      <button
        className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
        disabled={isSubmitting || !isHydrated}
        type="submit"
      >
        {isHydrated ? (isSubmitting ? "Entrando…" : "Entrar") : "Carregando…"}
      </button>
    </form>
  );
}
