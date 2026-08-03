# NEVAL 5

Aplicación de gestión comercial, compras y almacén para fábrica de mobiliario.

## Arranque local

1. Ejecuta `npx vercel env pull .env.local --environment=development`.
2. Ejecuta `npm run dev`.

La aplicación requiere Supabase. No incluye un modo de demostración ni datos simulados: cada pantalla lee y escribe únicamente los datos autorizados de la organización del usuario.

## Comprobaciones

- `npm run lint`
- `npm run typecheck` — TypeScript 7.
- `npm run build`

El lint conserva TypeScript 6 como dependencia de compatibilidad de `typescript-eslint`; el chequeo de tipos y el build usan TypeScript 7 mediante `@typescript/native`.

## Base de datos

La migración crea el núcleo multiempresa, RLS, almacenamiento privado de adjuntos y los dominios de clientes, catálogo, presupuestos, pedidos, compras, almacén y auditoría.
