"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="grid min-h-screen place-items-center bg-surface p-6 text-white"><section className="w-full max-w-md rounded-xl border border-line bg-surface-raised p-7 shadow-2xl"><p className="text-xs font-bold tracking-wider text-accent">NEVAL 5</p><h1 className="mt-3 text-2xl font-semibold">No se ha podido cargar esta pantalla</h1><p className="mt-3 text-sm leading-6 text-muted">Tu información no se ha modificado. Puedes volver a intentarlo o recargar la aplicación.</p>{error.digest && <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-muted">Referencia: {error.digest}</p>}<button onClick={reset} className="mt-6 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground">Reintentar</button></section></main>;
}
