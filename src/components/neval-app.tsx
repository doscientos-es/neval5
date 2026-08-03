"use client";

import Image from "next/image";
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";

type Section = "Dashboard" | "Clientes" | "Presupuestos" | "Pedidos" | "Compras" | "Almacén" | "Informes" | "Configuración";
type Client = { initials: string; name: string; company: string; phone: string; total: string; orders: number };

const navigation: { name: Section; icon: ComponentType<{ className?: string }> }[] = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Clientes", icon: Users },
  { name: "Presupuestos", icon: FileText },
  { name: "Pedidos", icon: Package },
  { name: "Compras", icon: ShoppingCart },
  { name: "Almacén", icon: Boxes },
  { name: "Informes", icon: BarChart3 },
  { name: "Configuración", icon: Settings },
];

const initialClients: Client[] = [
  { initials: "AS", name: "Ana Serrano", company: "Serrano Interiorismo", phone: "+34 612 480 920", total: "18.450 €", orders: 6 },
  { initials: "DM", name: "David Martínez", company: "Martínez & Hijos", phone: "+34 639 120 485", total: "12.890 €", orders: 4 },
  { initials: "LC", name: "Lucía Campos", company: "Campos Cocinas", phone: "+34 655 871 223", total: "8.210 €", orders: 3 },
  { initials: "JR", name: "Javier Rivas", company: "Rivas Reformas", phone: "+34 687 093 455", total: "7.850 €", orders: 2 },
];

const orders = [
  ["PED-2026-0042", "Serrano Interiorismo", "En fabricación", "14.860 €", "19 ago"],
  ["PED-2026-0041", "Martínez & Hijos", "Preparado", "8.720 €", "12 ago"],
  ["PED-2026-0040", "Campos Cocinas", "Pendiente", "5.940 €", "22 ago"],
  ["PED-2026-0039", "Rivas Reformas", "Entregado", "6.480 €", "8 ago"],
];

const titleCopy: Record<Section, { eyebrow: string; title: string; description: string; action: string }> = {
  Dashboard: { eyebrow: "Visión general", title: "Buenos días, Gerard", description: "Este es el pulso de la fábrica hoy.", action: "Nuevo presupuesto" },
  Clientes: { eyebrow: "Relaciones", title: "Clientes", description: "Gestiona contactos, historial y documentación.", action: "Nuevo cliente" },
  Presupuestos: { eyebrow: "Comercial", title: "Presupuestos", description: "Calcula, envía y convierte presupuestos en pedidos.", action: "Nuevo presupuesto" },
  Pedidos: { eyebrow: "Operativa", title: "Pedidos", description: "Sigue cada pedido desde su entrada hasta la entrega.", action: "Nuevo pedido" },
  Compras: { eyebrow: "Aprovisionamiento", title: "Compras", description: "Controla proveedores, solicitudes y recepciones.", action: "Nueva compra" },
  Almacén: { eyebrow: "Existencias", title: "Almacén", description: "Stock disponible, movimientos y alertas de mínimo.", action: "Ajustar stock" },
  Informes: { eyebrow: "Análisis", title: "Informes", description: "Convierte la actividad diaria en decisiones claras.", action: "Exportar informe" },
  Configuración: { eyebrow: "Administración", title: "Configuración", description: "Empresa, catálogo, tarifas, impuestos y usuarios.", action: "Guardar cambios" },
};

function Status({ value }: { value: string }) {
  const styles: Record<string, string> = {
    "En fabricación": "bg-[#253f26] text-[#bdff7b]",
    Preparado: "bg-[#2c3b32] text-[#d9f6d5]",
    Pendiente: "bg-[#4a3b1c] text-[#f8d870]",
    Entregado: "bg-[#183f2a] text-[#a9f5bc]",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] ?? "bg-surface-hover text-muted"}`}>{value}</span>;
}

function Metric({ label, value, note, icon: Icon, accent }: { label: string; value: string; note: string; icon: ComponentType<{ className?: string }>; accent?: boolean }) {
  return (
    <article className={`rounded-xl border p-5 ${accent ? "border-[#6c9b51] bg-primary" : "border-line bg-surface-raised"}`}>
      <div className="flex items-start justify-between"><p className={`text-sm ${accent ? "text-white/70" : "text-muted"}`}>{label}</p><Icon className={`size-4 ${accent ? "text-accent" : "text-[#bdff7b]"}`} /></div>
      <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-2 text-xs ${accent ? "text-white/70" : "text-muted"}`}>{note}</p>
    </article>
  );
}

export function NevalApp() {
  const [section, setSection] = useState<Section>("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [clients, setClients] = useState(initialClients);
  const [notice, setNotice] = useState<string | null>(null);
  const copy = titleCopy[section];
  const visibleClients = useMemo(() => clients.filter((client) => `${client.name} ${client.company}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);

  function addClient(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const company = String(formData.get("company") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    if (!name) return;
    setClients((current) => [{ initials: name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(), name, company: company || "Cliente particular", phone: phone || "Sin teléfono", total: "0 €", orders: 0 }, ...current]);
    setShowNewClient(false);
    setNotice("Cliente creado correctamente.");
  }

  const side = (
    <aside className="flex h-full w-72 shrink-0 flex-col border-e border-line bg-[#0d110c] p-4">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-accent"><Image src="https://hnzyllbksqvamqfubhri.supabase.co/storage/v1/object/public/brand-assets/logo/3f8bbbcd-c9da-47df-ad20-f801d397610a/logo.png" alt="doscientos" width={40} height={40} className="object-contain" /></div>
        <div><p className="font-semibold tracking-tight">NEVAL <span className="text-accent">5</span></p><p className="text-xs text-muted">Gestión de fábrica</p></div>
      </div>
      <nav className="mt-8 space-y-1" aria-label="Navegación principal">
        {navigation.map(({ name, icon: Icon }) => <button key={name} onClick={() => { setSection(name); setMobileOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${section === name ? "bg-primary text-white shadow-sm" : "text-[#bec8bb] hover:bg-surface-hover hover:text-white"}`}><Icon className="size-4" />{name}</button>)}
      </nav>
      <div className="mt-auto rounded-xl border border-line bg-surface-raised p-4"><p className="text-xs font-medium text-accent">ENTORNO DE DEMOSTRACIÓN</p><p className="mt-2 text-xs leading-5 text-muted">Conecta Supabase para activar los datos de tu empresa.</p><button onClick={() => setSection("Configuración")} className="mt-3 text-xs font-semibold text-white underline underline-offset-4">Configurar ahora</button></div>
      <div className="mt-4 flex items-center gap-3 border-t border-line px-2 pt-4"><div className="flex size-9 items-center justify-center rounded-full bg-[#31432f] text-sm font-bold text-accent">GM</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Gerard Martínez</p><p className="text-xs text-muted">Administrador</p></div><ChevronDown className="size-4 text-muted" /></div>
    </aside>
  );

  return <main className="min-h-screen bg-surface text-white lg:flex">
    <div className="fixed inset-y-0 start-0 z-40 hidden lg:block">{side}</div>
    {mobileOpen && <div className="fixed inset-0 z-50 flex lg:hidden"><button aria-label="Cerrar navegación" onClick={() => setMobileOpen(false)} className="flex-1 bg-black/60" /><div className="h-full">{side}</div></div>}
    <section className="min-w-0 flex-1 lg:ms-72">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-line bg-surface/95 px-5 backdrop-blur lg:px-8">
        <div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-md p-2 hover:bg-surface-hover lg:hidden" aria-label="Abrir navegación"><Menu className="size-5" /></button><div><p className="text-xs text-muted">{copy.eyebrow}</p><h1 className="font-semibold">{copy.title}</h1></div></div>
        <div className="flex items-center gap-2"><button className="rounded-lg border border-line p-2.5 text-muted hover:bg-surface-hover" aria-label="Notificaciones"><Bell className="size-4" /></button><Button onClick={() => section === "Clientes" ? setShowNewClient(true) : setNotice(`${copy.action} listo para conectar a Supabase.`)} className="h-10 gap-2 bg-accent px-3.5 font-bold text-accent-foreground hover:bg-accent/90"><Plus className="size-4" />{copy.action}</Button></div>
      </header>
      <div className="mx-auto max-w-[1550px] p-5 lg:p-8">
        {notice && <div className="mb-5 flex items-center justify-between rounded-lg border border-[#4b6e40] bg-[#1c2e19] px-4 py-3 text-sm text-[#d6f9c7]"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Cerrar aviso"><X className="size-4" /></button></div>}
        {section === "Dashboard" ? <Dashboard setSection={setSection} /> : section === "Clientes" ? <ClientsView clients={visibleClients} query={query} setQuery={setQuery} onAdd={() => setShowNewClient(true)} /> : <ModuleView section={section} onAction={() => setNotice(`${copy.action} listo para conectar a Supabase.`)} />}
      </div>
    </section>
    {showNewClient && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4"><form action={addClient} className="w-full max-w-md rounded-xl border border-line bg-surface-raised p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-accent">NUEVO REGISTRO</p><h2 className="mt-1 text-xl font-semibold">Añadir cliente</h2></div><button type="button" onClick={() => setShowNewClient(false)} className="rounded-md p-1 text-muted hover:bg-surface-hover"><X className="size-5" /></button></div><div className="mt-6 space-y-4"><label className="block text-sm">Nombre y apellidos<input required name="name" autoFocus className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-accent" placeholder="Ana Serrano" /></label><label className="block text-sm">Empresa<input name="company" className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-accent" placeholder="Serrano Interiorismo" /></label><label className="block text-sm">Teléfono<input name="phone" className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-accent" placeholder="+34 600 000 000" /></label></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setShowNewClient(false)} className="rounded-lg px-4 py-2.5 text-sm text-muted hover:bg-surface-hover">Cancelar</button><button className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground">Crear cliente</button></div></form></div>}
  </main>;
}

function Dashboard({ setSection }: { setSection: (section: Section) => void }) {
  return <div className="space-y-7"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Pedidos pendientes" value="24" note="6 requieren confirmación" icon={Package} /><Metric label="Valor de pedidos" value="48.970 €" note="+12,5 % frente a julio" icon={CircleDollarSign} accent /><Metric label="Preparados para entrega" value="7" note="3 programados esta semana" icon={Archive} /><Metric label="Stock bajo mínimo" value="5" note="Requieren reposición" icon={Boxes} /></section><section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]"><article className="rounded-xl border border-line bg-surface-raised"><div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="font-semibold">Pedidos recientes</h2><p className="mt-1 text-sm text-muted">Actividad comercial de agosto</p></div><button onClick={() => setSection("Pedidos")} className="inline-flex items-center gap-1 text-sm font-semibold text-accent">Ver todos <ArrowUpRight className="size-4" /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-4 font-medium">Pedido</th><th className="px-5 py-4 font-medium">Cliente</th><th className="px-5 py-4 font-medium">Estado</th><th className="px-5 py-4 font-medium text-right">Importe</th><th className="px-5 py-4 font-medium">Entrega</th></tr></thead><tbody>{orders.map(([number, client, state, value, date]) => <tr key={number} className="border-t border-line/70 hover:bg-surface-hover/60"><td className="px-5 py-4 font-semibold">{number}</td><td className="px-5 py-4 text-[#d5ddd2]">{client}</td><td className="px-5 py-4"><Status value={state} /></td><td className="px-5 py-4 text-right font-semibold">{value}</td><td className="px-5 py-4 text-muted">{date}</td></tr>)}</tbody></table></div></article><article className="rounded-xl border border-line bg-surface-raised p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Alertas de almacén</h2><p className="mt-1 text-sm text-muted">Material bajo mínimo</p></div><span className="rounded-full bg-[#4a3b1c] px-2.5 py-1 text-xs font-bold text-[#f8d870]">5 alertas</span></div><div className="mt-5 space-y-3">{[["Bisagra cazoleta 110°", "312 uds", "500 uds"], ["Tablero roble natural 19 mm", "6 uds", "12 uds"], ["Cola PUR transparente", "4 kg", "10 kg"], ["Perfil aluminio negro", "9 m", "20 m"]].map(([name, stock, minimum]) => <div key={name} className="flex items-center justify-between rounded-lg border border-line bg-surface p-3"><div><p className="text-sm font-medium">{name}</p><p className="mt-1 text-xs text-muted">Mínimo: {minimum}</p></div><p className="text-sm font-semibold text-[#f8d870]">{stock}</p></div>)}</div><button onClick={() => setSection("Almacén")} className="mt-5 w-full rounded-lg border border-line py-2.5 text-sm font-semibold text-[#d5ddd2] hover:bg-surface-hover">Revisar almacén</button></article></section></div>;
}

function ClientsView({ clients, query, setQuery, onAdd }: { clients: Client[]; query: string; setQuery: (value: string) => void; onAdd: () => void }) {
  return <div className="space-y-6"><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-semibold tracking-tight">Directorio de clientes</h2><p className="mt-1 text-sm text-muted">{clients.length} clientes activos · historial y documentación centralizados</p></div><button onClick={onAdd} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground"><Plus className="size-4" />Añadir cliente</button></section><article className="overflow-hidden rounded-xl border border-line bg-surface-raised"><div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente o empresa" className="w-full rounded-lg border border-line bg-surface py-2.5 ps-9 pe-3 text-sm outline-none placeholder:text-muted focus:border-accent" /></div><button className="rounded-lg border border-line px-3 py-2.5 text-sm text-muted hover:bg-surface-hover">Todos los estados <ChevronDown className="ms-2 inline size-4" /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-4 font-medium">Cliente</th><th className="px-5 py-4 font-medium">Contacto</th><th className="px-5 py-4 font-medium text-center">Pedidos</th><th className="px-5 py-4 font-medium text-right">Valor histórico</th><th className="px-5 py-4 font-medium"></th></tr></thead><tbody>{clients.map((client) => <tr key={`${client.name}-${client.company}`} className="border-b border-line/70 last:border-0 hover:bg-surface-hover/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-primary text-xs font-bold text-accent">{client.initials}</div><div><p className="font-semibold">{client.name}</p><p className="mt-0.5 text-xs text-muted">{client.company}</p></div></div></td><td className="px-5 py-4 text-muted">{client.phone}</td><td className="px-5 py-4 text-center font-semibold">{client.orders}</td><td className="px-5 py-4 text-right font-semibold">{client.total}</td><td className="px-5 py-4 text-right"><button className="rounded-lg px-3 py-2 text-xs font-semibold text-accent hover:bg-surface">Ver ficha</button></td></tr>)}</tbody></table>{clients.length === 0 && <div className="p-12 text-center text-sm text-muted">No hay resultados para esta búsqueda.</div>}</div></article></div>;
}

function ModuleView({ section, onAction }: { section: Section; onAction: () => void }) {
  const blocks: Partial<Record<Section, [string, string, string][]>> = {
    Presupuestos: [["PRE-2026-0028", "Serrano Interiorismo", "Enviado"], ["PRE-2026-0027", "Campos Cocinas", "Aceptado"], ["PRE-2026-0026", "Rivas Reformas", "Borrador"]],
    Pedidos: orders.map(([a, b, c]) => [a, b, c]),
    Compras: [["COM-2026-0017", "Tableros Levante", "Recibido parcialmente"], ["COM-2026-0016", "Herrajes Mediterráneo", "Solicitado"], ["COM-2026-0015", "Aluminios Costa", "Borrador"]],
    Almacén: [["Tablero roble natural 19 mm", "Tableros", "6 uds · mínimo 12"], ["Bisagra cazoleta 110°", "Herrajes", "312 uds · mínimo 500"], ["Perfil aluminio negro", "Perfilería", "9 m · mínimo 20"]],
    Informes: [["Pedidos por estado", "Agosto 2026", "24 pendientes"], ["Ventas por comercial", "Agosto 2026", "48.970 €"], ["Rotación de almacén", "Últimos 90 días", "12 referencias"]],
    Configuración: [["Empresa", "Datos fiscales y numeración", "NEVAL 5"], ["Catálogo", "Productos, familias y tarifas", "128 productos"], ["Usuarios", "Roles y accesos", "8 usuarios activos"]],
  };
  const rows = blocks[section] ?? [];
  return <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]"><article className="rounded-xl border border-line bg-surface-raised"><div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="font-semibold">{section}</h2><p className="mt-1 text-sm text-muted">Datos de demostración listos para persistir en Supabase.</p></div><button onClick={onAction} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-accent hover:bg-surface-hover">Gestionar</button></div><div className="divide-y divide-line">{rows.map(([title, meta, status]) => <div key={title} className="flex items-center justify-between gap-4 p-5"><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted">{meta}</p></div><span className="rounded-full bg-surface px-2.5 py-1 text-xs text-[#d6dfd3]">{status}</span></div>)}</div></article><aside className="rounded-xl border border-line bg-primary p-6"><p className="text-xs font-bold tracking-wider text-accent">PRÓXIMO PASO</p><h2 className="mt-3 text-xl font-semibold">Conecta tu proyecto de Supabase</h2><p className="mt-3 text-sm leading-6 text-white/70">La interfaz ya refleja los módulos activos. Al añadir las variables de entorno, las acciones pasarán de datos de demostración a datos de empresa aislados por organización.</p><button onClick={onAction} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground">Ver configuración <ArrowUpRight className="size-4" /></button></aside></div>;
}
