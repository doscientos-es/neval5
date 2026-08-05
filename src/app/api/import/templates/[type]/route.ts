export const dynamic = "force-dynamic";

const templates: Record<string, string> = {
  customers: "identificador;nombre;empresa;email;telefono;movil;direccion;poblacion;provincia\r\n;Ana Serrano;Serrano Interiorismo;ana@ejemplo.es;+34900000000;+34600000000;Calle Mayor 1;Madrid;Madrid\r\n",
  products: "codigo;nombre;descripcion;precio_base;inventariable;unidad;stock_minimo\r\nTAB-001;Tablero melamina blanco;Tablero 19 mm;45.50;si;ud;5\r\n",
  tariffs: "tarifa;codigo_producto;precio_unitario\r\nProfesional;TAB-001;39.50\r\n",
};

export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const content = templates[type];
  if (!content) return Response.json({ error: "Plantilla no disponible" }, { status: 404 });
  return new Response(`\uFEFF${content}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="plantilla-${type}.csv"`, "Cache-Control": "no-store" } });
}
