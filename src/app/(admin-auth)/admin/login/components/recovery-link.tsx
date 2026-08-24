import Link from "next/link";

export function RecoveryLink() {
  return (
    <Link
      className="mt-6 inline-block text-sm font-medium text-indigo-700 underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-indigo-600"
      href="/admin/forgot-password"
    >
      Esqueci minha senha
    </Link>
  );
}
