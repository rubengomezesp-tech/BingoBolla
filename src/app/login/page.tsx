import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-4 text-white">
      <div className="card glass w-full max-w-md p-6 text-center">
        <div className="font-display text-3xl">BingoBolla</div>
        <div className="mt-3 text-sm font-semibold text-[var(--color-fg-dim)]">Cargando acceso...</div>
      </div>
    </div>
  );
}
