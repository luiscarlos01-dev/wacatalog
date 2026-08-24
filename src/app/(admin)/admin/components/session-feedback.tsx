"use client";

export function SessionFeedback({ message }: { message: string }) {
  return (
    <p
      aria-live="polite"
      className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950"
      role="status"
    >
      {message}
    </p>
  );
}
