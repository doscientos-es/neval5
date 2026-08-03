# NEVAL 5

Aplicación de gestión comercial, compras y almacén para fábrica de mobiliario.

## Arranque local

1. Copia `.env.example` como `.env.local` y completa las credenciales de Supabase.
2. Crea un proyecto en Supabase y aplica la migración de `supabase/migrations`.
3. Ejecuta `npm run dev`.

Mientras no haya credenciales, la aplicación muestra datos de demostración para validar la interfaz y los flujos.

## Comprobaciones

- `npm run lint`
- `npm run typecheck` — TypeScript 7.
- `npm run build`

El lint conserva TypeScript 6 como dependencia de compatibilidad de `typescript-eslint`; el chequeo de tipos y el build usan TypeScript 7 mediante `@typescript/native`.

## Base de datos

La migración crea el núcleo multiempresa, RLS, almacenamiento privado de adjuntos y los dominios de clientes, catálogo, presupuestos, pedidos, compras, almacén y auditoría.
