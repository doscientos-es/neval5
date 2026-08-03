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
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { archiveCustomer, createCustomer, updateCustomer } from "@/app/actions/customers";
import { createProduct } from "@/app/actions/catalog";
import { changeOrderStatus, convertQuote, createQuote, duplicateOrder } from "@/app/actions/commercial";
import type { CustomerSummary } from "@/features/customers/customer-repository";
import type { DashboardData } from "@/features/dashboard/dashboard-repository";
import type { CatalogData } from "@/features/catalog/catalog-repository";
import type { CommercialData, OrderSummary, QuoteSummary } from "@/features/commercial/commercial-repository";
import type { InventoryData } from "@/features/inventory/inventory-repository";

type Section = "Dashboard" | "Clientes" | "Presupuestos" | "Pedidos" | "Compras" | "Almacén" | "Informes" | "Configuración";
type Client = CustomerSummary;

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

const titleCopy: Record<Section, { eyebrow: string; title: string; description: string; action: string }> = {
  Dashboard: { eyebrow: "Visión general", title: "Panel de control", description: "Actividad de tu empresa en tiempo real.", action: "Nuevo presupuesto" },
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
    in_manufacturing: "bg-[#253f26] text-[#bdff7b]",
    ready: "bg-[#2c3b32] text-[#d9f6d5]",
    pending: "bg-[#4a3b1c] text-[#f8d870]",
    delivered: "bg-[#183f2a] text-[#a9f5bc]",
    draft: "bg-surface-hover text-[#d9f6d5]",
    sent: "bg-[#19354a] text-[#a8ddff]",
    accepted: "bg-[#183f2a] text-[#a9f5bc]",
    rejected: "bg-[#4a2424] text-[#ffb5b5]",
    expired: "bg-surface-hover text-muted",
    converted: "bg-[#253f26] text-[#bdff7b]",
  };
  const labels: Record<string, string> = { in_manufacturing: "En fabricación", ready: "Preparado", pending: "Pendiente", delivered: "Entregado", draft: "Borrador", sent: "Enviado", accepted: "Aceptado", rejected: "Rechazado", expired: "Caducado", converted: "Convertido" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] ?? "bg-surface-hover text-muted"}`}>{labels[value] ?? value}</span>;
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

export function NevalApp({ initialCustomers, dashboard, catalog, commercial, inventory }: { initialCustomers: Client[]; dashboard: DashboardData | null; catalog: CatalogData | null; commercial: CommercialData | null; inventory: InventoryData | null }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [clients, setClients] = useState(initialCustomers);
  const [notice, setNotice] = useState<string | null>(null);
  const copy = titleCopy[section];
  const visibleClients = useMemo(() => clients.filter((client) => `${client.name} ${client.company}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);

  async function addClient(formData: FormData) {
    const result = await createCustomer(formData);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setClients((current) => [result.customer, ...current]);
    setShowNewClient(false);
    setNotice("Cliente guardado correctamente.");
  }

  async function saveClient(formData: FormData) {
    if (!editingClient) return;
    const result = await updateCustomer(editingClient.id, formData);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setClients((current) => current.map((client) => client.id === result.customer.id ? result.customer : client));
    setEditingClient(null);
    setNotice("Ficha de cliente actualizada correctamente.");
  }

  async function removeClient(client: Client) {
    if (!window.confirm(`¿Archivar a ${client.name}? Podrás conservar su historial y recuperarlo desde administración.`)) return;
    const result = await archiveCustomer(client.id);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setClients((current) => current.filter((item) => item.id !== client.id));
    setNotice("Cliente archivado. Su historial se conserva.");
  }

  async function runCommercial(action: () => Promise<{ ok: boolean; message: string }>) {
    const result = await action();
    setNotice(result.message);
    if (result.ok) router.refresh();
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
      <div className="mt-auto rounded-xl border border-line bg-surface-raised p-4"><p className="text-xs font-medium text-accent">EMPRESA ACTIVA</p><p className="mt-2 text-xs leading-5 text-muted">Datos protegidos y aislados por organización.</p><button onClick={() => setSection("Configuración")} className="mt-3 text-xs font-semibold text-white underline underline-offset-4">Ir a configuración</button></div>
      <div className="mt-4 flex items-center gap-3 border-t border-line px-2 pt-4"><div className="flex size-9 items-center justify-center rounded-full bg-[#31432f] text-sm font-bold text-accent">{(dashboard?.userName ?? "U").slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{dashboard?.userName ?? "Usuario"}</p><p className="text-xs text-muted">Sesión segura</p></div><ChevronDown className="size-4 text-muted" /></div>
    </aside>
  );

  return <main className="min-h-screen bg-surface text-white lg:flex">
    <div className="fixed inset-y-0 start-0 z-40 hidden lg:block">{side}</div>
    {mobileOpen && <div className="fixed inset-0 z-50 flex lg:hidden"><button aria-label="Cerrar navegación" onClick={() => setMobileOpen(false)} className="flex-1 bg-black/60" /><div className="h-full">{side}</div></div>}
    <section className="min-w-0 flex-1 lg:ms-72">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-line bg-surface/95 px-5 backdrop-blur lg:px-8">
        <div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-md p-2 hover:bg-surface-hover lg:hidden" aria-label="Abrir navegación"><Menu className="size-5" /></button><div><p className="text-xs text-muted">{copy.eyebrow}</p><h1 className="font-semibold">{copy.title}</h1></div></div>
        <div className="flex items-center gap-2"><button className="rounded-lg border border-line p-2.5 text-muted hover:bg-surface-hover" aria-label="Notificaciones"><Bell className="size-4" /></button><Button onClick={() => section === "Clientes" ? setShowNewClient(true) : section === "Configuración" ? setShowNewProduct(true) : section === "Presupuestos" ? setShowNewQuote(true) : setNotice("Esta acción estará disponible desde el módulo correspondiente.")} className="h-10 gap-2 bg-accent px-3.5 font-bold text-accent-foreground hover:bg-accent/90"><Plus className="size-4" />{section === "Configuración" ? "Nuevo producto" : copy.action}</Button></div>
      </header>
      <div className="mx-auto max-w-[1550px] p-5 lg:p-8">
        {notice && <div className="mb-5 flex items-center justify-between rounded-lg border border-[#4b6e40] bg-[#1c2e19] px-4 py-3 text-sm text-[#d6f9c7]"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Cerrar aviso"><X className="size-4" /></button></div>}
        {section === "Dashboard" ? <Dashboard data={dashboard} setSection={setSection} /> : section === "Clientes" ? <ClientsView clients={visibleClients} query={query} setQuery={setQuery} onAdd={() => setShowNewClient(true)} onEdit={setEditingClient} onArchive={removeClient} /> : section === "Configuración" ? <CatalogView catalog={catalog} onAdd={() => setShowNewProduct(true)} /> : section === "Presupuestos" ? <QuotesView quotes={commercial?.quotes ?? []} onConvert={(id) => runCommercial(() => convertQuote(id))} onAdd={() => setShowNewQuote(true)} /> : section === "Pedidos" ? <OrdersView orders={commercial?.orders ?? []} onStatus={(id, status) => runCommercial(() => changeOrderStatus(id, status))} onDuplicate={(id) => runCommercial(() => duplicateOrder(id))} /> : section === "Compras" || section === "Almacén" ? <InventoryView section={section} inventory={inventory} /> : <ModuleView section={section} onAction={() => setNotice("Módulo en preparación.")} />}
      </div>
    </section>
    {(showNewClient || editingClient) && <CustomerForm client={editingClient} action={async (formData) => { if (editingClient) await saveClient(formData); else await addClient(formData); }} onClose={() => { setShowNewClient(false); setEditingClient(null); }} />}
    {showNewProduct && <ProductForm catalog={catalog} onClose={() => setShowNewProduct(false)} onNotice={setNotice} />}
    {showNewQuote && <QuoteForm customers={clients} catalog={catalog} onClose={() => setShowNewQuote(false)} onNotice={(message) => { setNotice(message); router.refresh(); }} />}
  </main>;
}

function CatalogView({ catalog, onAdd }: { catalog: CatalogData | null; onAdd: () => void }) {
  const products = catalog?.products ?? [];
  return <div className="space-y-6"><section className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight">Catálogo de productos</h2><p className="mt-1 text-sm text-muted">Productos, familias, tarifas e impuestos de la empresa.</p></div><button onClick={onAdd} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground"><Plus className="size-4" />Nuevo producto</button></section><article className="overflow-hidden rounded-xl border border-line bg-surface-raised"><div className="grid border-b border-line text-xs uppercase tracking-wider text-muted sm:grid-cols-4"><p className="p-4">{products.length} productos activos</p><p className="p-4">{catalog?.families.length ?? 0} familias</p><p className="p-4">{catalog?.taxes.length ?? 0} tipos de IVA</p><p className="p-4">Precios en EUR</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-4">Código</th><th className="px-5 py-4">Producto</th><th className="px-5 py-4">Familia</th><th className="px-5 py-4">IVA</th><th className="px-5 py-4 text-right">Precio base</th><th className="px-5 py-4">Stock</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b border-line/70 last:border-0"><td className="px-5 py-4 font-mono text-xs text-accent">{product.code}</td><td className="px-5 py-4"><p className="font-semibold">{product.name}</p>{product.description && <p className="mt-1 line-clamp-1 text-xs text-muted">{product.description}</p>}</td><td className="px-5 py-4 text-muted">{product.familyName}</td><td className="px-5 py-4 text-muted">{product.taxName}</td><td className="px-5 py-4 text-right font-semibold">{new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(product.basePrice))}</td><td className="px-5 py-4 text-muted">{product.trackStock ? `Controlado · mín. ${product.minimumStock} ${product.stockUnit}` : "No inventariable"}</td></tr>)}</tbody></table>{products.length === 0 && <p className="p-12 text-center text-sm text-muted">Aún no hay productos. Crea el primero para usarlo en presupuestos y compras.</p>}</div></article></div>;
}

function ProductForm({ catalog, onClose, onNotice }: { catalog: CatalogData | null; onClose: () => void; onNotice: (message: string) => void }) {
  const input = "mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-accent";
  async function submit(formData: FormData) { const result = await createProduct(formData); onNotice(result.message); if (result.ok) onClose(); }
  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 p-4"><form action={submit} className="mx-auto my-6 w-full max-w-2xl rounded-xl border border-line bg-surface-raised p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-accent">CATÁLOGO</p><h2 className="mt-1 text-xl font-semibold">Nuevo producto</h2></div><button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface-hover" aria-label="Cerrar"><X className="size-5" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block text-sm">Código<input required name="code" autoFocus className={input} placeholder="TAB-001" /></label><label className="block text-sm">Nombre<input required name="name" className={input} placeholder="Tablero melamina blanco" /></label><label className="block text-sm">Familia<select name="familyId" className={input}><option value="">Sin familia</option>{catalog?.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select></label><label className="block text-sm">IVA<select name="taxRateId" defaultValue={catalog?.taxes.find((tax) => tax.isDefault)?.id ?? ""} className={input}><option value="">Sin asignar</option>{catalog?.taxes.map((tax) => <option key={tax.id} value={tax.id}>{tax.name} ({tax.rate}%)</option>)}</select></label><label className="block text-sm">Precio base (EUR)<input required name="basePrice" type="number" min="0" step="0.01" defaultValue="0" className={input} /></label><label className="block text-sm">Unidad<input name="stockUnit" defaultValue="ud" className={input} /></label><label className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-3 text-sm sm:col-span-2"><input name="trackStock" type="checkbox" className="size-4 accent-[#bdff7b]" />Controlar existencias de este producto</label><label className="block text-sm">Stock mínimo<input name="minimumStock" type="number" min="0" step="0.001" defaultValue="0" className={input} /></label><label className="block text-sm sm:col-span-2">Descripción<textarea name="description" className={`${input} min-h-24 resize-y`} /></label></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm text-muted hover:bg-surface-hover">Cancelar</button><button className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground">Guardar producto</button></div></form></div>;
}

function Dashboard({ data, setSection }: { data: DashboardData | null; setSection: (section: Section) => void }) {
  const dashboard = data ?? { pendingOrders: 0, readyOrders: 0, deliveredOrders: 0, orderValue: "0,00 €", lowStock: 0, recentOrders: [], alerts: [] };
  return <div className="space-y-7"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Pedidos pendientes" value={String(dashboard.pendingOrders)} note="Pendientes de gestionar" icon={Package} /><Metric label="Valor de pedidos" value={dashboard.orderValue} note="Valor comercial acumulado" icon={CircleDollarSign} accent /><Metric label="Preparados para entrega" value={String(dashboard.readyOrders)} note={`${dashboard.deliveredOrders} pedidos entregados`} icon={Archive} /><Metric label="Stock bajo mínimo" value={String(dashboard.lowStock)} note="Referencias que requieren reposición" icon={Boxes} /></section><section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]"><article className="rounded-xl border border-line bg-surface-raised"><div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="font-semibold">Pedidos recientes</h2><p className="mt-1 text-sm text-muted">Actividad comercial real</p></div><button onClick={() => setSection("Pedidos")} className="inline-flex items-center gap-1 text-sm font-semibold text-accent">Ver todos <ArrowUpRight className="size-4" /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-4 font-medium">Pedido</th><th className="px-5 py-4 font-medium">Cliente</th><th className="px-5 py-4 font-medium">Estado</th><th className="px-5 py-4 font-medium text-right">Importe</th><th className="px-5 py-4 font-medium">Fecha</th></tr></thead><tbody>{dashboard.recentOrders.map((order) => <tr key={order.number} className="border-t border-line/70 hover:bg-surface-hover/60"><td className="px-5 py-4 font-semibold">{order.number}</td><td className="px-5 py-4 text-[#d5ddd2]">{order.customer}</td><td className="px-5 py-4"><Status value={order.status} /></td><td className="px-5 py-4 text-right font-semibold">{order.total}</td><td className="px-5 py-4 text-muted">{order.createdAt}</td></tr>)}</tbody></table>{dashboard.recentOrders.length === 0 && <p className="p-10 text-center text-sm text-muted">Todavía no hay pedidos registrados.</p>}</div></article><article className="rounded-xl border border-line bg-surface-raised p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Alertas de almacén</h2><p className="mt-1 text-sm text-muted">Material bajo mínimo</p></div><span className="rounded-full bg-[#4a3b1c] px-2.5 py-1 text-xs font-bold text-[#f8d870]">{dashboard.alerts.length} alertas</span></div><div className="mt-5 space-y-3">{dashboard.alerts.map((alert) => <div key={alert.name} className="flex items-center justify-between rounded-lg border border-line bg-surface p-3"><div><p className="text-sm font-medium">{alert.name}</p><p className="mt-1 text-xs text-muted">Mínimo: {alert.minimum}</p></div><p className="text-sm font-semibold text-[#f8d870]">{alert.stock}</p></div>)}</div>{dashboard.alerts.length === 0 && <p className="mt-8 text-center text-sm text-muted">No hay alertas de stock.</p>}<button onClick={() => setSection("Almacén")} className="mt-5 w-full rounded-lg border border-line py-2.5 text-sm font-semibold text-[#d5ddd2] hover:bg-surface-hover">Revisar almacén</button></article></section></div>;
}

function QuotesView({ quotes, onConvert, onAdd }: { quotes: QuoteSummary[]; onConvert: (id: string) => void; onAdd: () => void }) {
  return <div className="space-y-6"><section className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold tracking-tight">Presupuestos</h2><p className="mt-1 text-sm text-muted">Importes, IVA y numeración calculados de forma segura en servidor.</p></div><button onClick={onAdd} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground"><Plus className="size-4" />Nuevo presupuesto</button></section><article className="overflow-hidden rounded-xl border border-line bg-surface-raised"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-4">Número</th><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4 text-right">Total</th><th className="px-5 py-4" /></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id} className="border-b border-line/70 last:border-0"><td className="px-5 py-4 font-semibold">{quote.number}</td><td className="px-5 py-4 text-muted">{quote.customer}</td><td className="px-5 py-4"><Status value={quote.status} /></td><td className="px-5 py-4 text-muted">{quote.createdAt}</td><td className="px-5 py-4 text-right font-semibold">{quote.total}</td><td className="px-5 py-4 text-right">{quote.status !== "converted" && quote.status !== "rejected" && quote.status !== "expired" && <button onClick={() => onConvert(quote.id)} className="rounded-lg px-3 py-2 text-xs font-semibold text-accent hover:bg-surface">Convertir en pedido</button>}</td></tr>)}</tbody></table>{quotes.length === 0 && <p className="p-12 text-center text-sm text-muted">Aún no hay presupuestos. Crea el primero desde un cliente y una línea de catálogo o libre.</p>}</div></article></div>;
}

function OrdersView({ orders, onStatus, onDuplicate }: { orders: OrderSummary[]; onStatus: (id: string, status: "pending" | "in_manufacturing" | "ready" | "delivered") => void; onDuplicate: (id: string) => void }) {
  return <div className="space-y-6"><section><h2 className="text-2xl font-semibold tracking-tight">Pedidos</h2><p className="mt-1 text-sm text-muted">Seguimiento, estados y duplicación con historial de cambios.</p></section><article className="overflow-hidden rounded-xl border border-line bg-surface-raised"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-4">Número</th><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4 text-right">Total</th><th className="px-5 py-4" /></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-line/70 last:border-0"><td className="px-5 py-4 font-semibold">{order.number}</td><td className="px-5 py-4 text-muted">{order.customer}</td><td className="px-5 py-4"><Status value={order.status} /></td><td className="px-5 py-4 text-muted">{order.createdAt}</td><td className="px-5 py-4 text-right font-semibold">{order.total}</td><td className="px-5 py-4 text-right"><select aria-label={`Cambiar estado de ${order.number}`} value={order.status} onChange={(event) => onStatus(order.id, event.target.value as "pending" | "in_manufacturing" | "ready" | "delivered")} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs"><option value="pending">Pendiente</option><option value="in_manufacturing">En fabricación</option><option value="ready">Preparado</option><option value="delivered">Entregado</option></select><button onClick={() => onDuplicate(order.id)} className="ml-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-accent hover:bg-surface">Duplicar</button></td></tr>)}</tbody></table>{orders.length === 0 && <p className="p-12 text-center text-sm text-muted">Aún no hay pedidos. Convierte un presupuesto para crear uno.</p>}</div></article></div>;
}

function InventoryView({ section, inventory }: { section: "Compras" | "Almacén"; inventory: InventoryData | null }) {
  if (section === "Compras") return <div className="space-y-6"><section><h2 className="text-2xl font-semibold tracking-tight">Compras</h2><p className="mt-1 text-sm text-muted">Proveedores y pedidos de compra de la empresa.</p></section><div className="grid gap-6 xl:grid-cols-2"><article className="rounded-xl border border-line bg-surface-raised"><div className="border-b border-line p-5"><h3 className="font-semibold">Proveedores activos</h3></div><div className="divide-y divide-line">{inventory?.suppliers.map((supplier) => <div key={supplier.id} className="p-4"><p className="font-medium">{supplier.name}</p><p className="mt-1 text-xs text-muted">{supplier.contactName || supplier.email || supplier.phone || "Sin contacto"}</p></div>)}{!inventory?.suppliers.length && <p className="p-10 text-center text-sm text-muted">Aún no hay proveedores.</p>}</div></article><article className="rounded-xl border border-line bg-surface-raised"><div className="border-b border-line p-5"><h3 className="font-semibold">Pedidos de compra</h3></div><div className="divide-y divide-line">{inventory?.purchases.map((purchase) => <div key={purchase.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium">{purchase.number} · {purchase.supplier}</p><p className="mt-1 text-xs text-muted">{purchase.total} EUR</p></div><Status value={purchase.status} /></div>)}{!inventory?.purchases.length && <p className="p-10 text-center text-sm text-muted">Aún no hay pedidos de compra.</p>}</div></article></div></div>;
  return <div className="space-y-6"><section><h2 className="text-2xl font-semibold tracking-tight">Almacén</h2><p className="mt-1 text-sm text-muted">Existencias agregadas por producto y alertas de stock mínimo.</p></section><article className="overflow-hidden rounded-xl border border-line bg-surface-raised"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-4">Código</th><th className="px-5 py-4">Artículo</th><th className="px-5 py-4 text-right">Disponible</th><th className="px-5 py-4 text-right">Mínimo</th><th className="px-5 py-4">Estado</th></tr></thead><tbody>{inventory?.stock.map((item) => <tr key={item.id} className="border-b border-line/70 last:border-0"><td className="px-5 py-4 font-mono text-xs text-accent">{item.code}</td><td className="px-5 py-4 font-semibold">{item.name}</td><td className="px-5 py-4 text-right">{item.available} {item.unit}</td><td className="px-5 py-4 text-right text-muted">{item.minimum} {item.unit}</td><td className="px-5 py-4">{item.available < item.minimum ? <span className="rounded-full bg-[#4a3b1c] px-2.5 py-1 text-xs font-semibold text-[#f8d870]">Bajo mínimo</span> : <span className="rounded-full bg-[#183f2a] px-2.5 py-1 text-xs font-semibold text-[#a9f5bc]">Correcto</span>}</td></tr>)}</tbody></table>{!inventory?.stock.length && <p className="p-12 text-center text-sm text-muted">No hay artículos inventariables.</p>}</div></article></div>;
}

function QuoteForm({ customers, catalog, onClose, onNotice }: { customers: Client[]; catalog: CatalogData | null; onClose: () => void; onNotice: (message: string) => void }) {
  const input = "mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-accent";
  async function submit(formData: FormData) { const result = await createQuote(formData); onNotice(result.message); if (result.ok) onClose(); }
  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 p-4"><form action={submit} className="mx-auto my-6 w-full max-w-2xl rounded-xl border border-line bg-surface-raised p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-accent">CIRCUITO COMERCIAL</p><h2 className="mt-1 text-xl font-semibold">Nuevo presupuesto</h2></div><button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface-hover" aria-label="Cerrar"><X className="size-5" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block text-sm sm:col-span-2">Cliente<select required name="customerId" className={input} defaultValue=""><option value="" disabled>Selecciona un cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.company}</option>)}</select></label><label className="block text-sm sm:col-span-2">Producto de catálogo (opcional)<select name="productId" className={input} defaultValue=""><option value="">Línea libre</option>{catalog?.products.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}</option>)}</select></label><label className="block text-sm sm:col-span-2">Descripción de la línea<input required name="description" className={input} placeholder="Descripción comercial" /></label><label className="block text-sm">Cantidad<input required name="quantity" type="number" min="0.001" step="0.001" defaultValue="1" className={input} /></label><label className="block text-sm">Unidad<input name="unit" defaultValue="ud" className={input} /></label><label className="block text-sm">Precio unitario (EUR)<input required name="unitPrice" type="number" min="0" step="0.01" defaultValue="0" className={input} /></label><label className="block text-sm">IVA (%)<input required name="taxRate" type="number" min="0" max="100" step="0.01" defaultValue="21" className={input} /></label><label className="block text-sm">Descuento de línea (%)<input name="lineDiscount" type="number" min="0" max="100" step="0.01" defaultValue="0" className={input} /></label><label className="block text-sm">Descuento global (%)<input name="globalDiscount" type="number" min="0" max="100" step="0.01" defaultValue="0" className={input} /></label><label className="block text-sm sm:col-span-2">Observaciones<textarea name="notes" className={`${input} min-h-24 resize-y`} /></label></div><p className="mt-4 text-xs leading-5 text-muted">Los precios, descuentos, IVA, totales y número se validan y recalculan en servidor al guardar.</p><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm text-muted hover:bg-surface-hover">Cancelar</button><button className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground">Crear presupuesto</button></div></form></div>;
}

function ClientsView({ clients, query, setQuery, onAdd, onEdit, onArchive }: { clients: Client[]; query: string; setQuery: (value: string) => void; onAdd: () => void; onEdit: (client: Client) => void; onArchive: (client: Client) => void }) {
  return <div className="space-y-6"><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-semibold tracking-tight">Directorio de clientes</h2><p className="mt-1 text-sm text-muted">{clients.length} clientes activos · historial y documentación centralizados</p></div><button onClick={onAdd} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground"><Plus className="size-4" />Añadir cliente</button></section><article className="overflow-hidden rounded-xl border border-line bg-surface-raised"><div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente o empresa" className="w-full rounded-lg border border-line bg-surface py-2.5 ps-9 pe-3 text-sm outline-none placeholder:text-muted focus:border-accent" /></div><span className="rounded-lg border border-line px-3 py-2.5 text-sm text-muted">Activos</span></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-4 font-medium">Cliente</th><th className="px-5 py-4 font-medium">Contacto</th><th className="px-5 py-4 font-medium text-center">Pedidos</th><th className="px-5 py-4 font-medium text-right">Valor histórico</th><th className="px-5 py-4 font-medium"></th></tr></thead><tbody>{clients.map((client) => <tr key={client.id} className="border-b border-line/70 last:border-0 hover:bg-surface-hover/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-primary text-xs font-bold text-accent">{client.initials}</div><div><p className="font-semibold">{client.name}</p><p className="mt-0.5 text-xs text-muted">{client.company}</p></div></div></td><td className="px-5 py-4 text-muted">{client.phone}</td><td className="px-5 py-4 text-center font-semibold">{client.orders}</td><td className="px-5 py-4 text-right font-semibold">{client.total}</td><td className="px-5 py-4 text-right"><button onClick={() => onEdit(client)} className="rounded-lg px-3 py-2 text-xs font-semibold text-accent hover:bg-surface">Ver ficha</button><button onClick={() => onArchive(client)} className="rounded-lg px-2 py-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-white">Archivar</button></td></tr>)}</tbody></table>{clients.length === 0 && <div className="p-12 text-center text-sm text-muted">No hay resultados para esta búsqueda.</div>}</div></article></div>;
}

function CustomerForm({ client, action, onClose }: { client: Client | null; action: (formData: FormData) => Promise<void>; onClose: () => void }) {
  const input = "mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-accent";
  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 p-4"><form action={action} className="mx-auto my-6 w-full max-w-2xl rounded-xl border border-line bg-surface-raised p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-accent">{client ? "FICHA DE CLIENTE" : "NUEVO REGISTRO"}</p><h2 className="mt-1 text-xl font-semibold">{client ? client.name : "Añadir cliente"}</h2></div><button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface-hover" aria-label="Cerrar"><X className="size-5" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block text-sm sm:col-span-2">Nombre y apellidos<input required name="name" autoFocus defaultValue={client?.name} className={input} placeholder="Ana Serrano" /></label><label className="block text-sm">Empresa<input name="company" defaultValue={client?.company === "Cliente particular" ? "" : client?.company} className={input} placeholder="Serrano Interiorismo" /></label><label className="block text-sm">Correo electrónico<input type="email" name="email" defaultValue={client?.email} className={input} placeholder="ana@empresa.es" /></label><label className="block text-sm">Teléfono<input name="phone" defaultValue={client?.phone === "Sin teléfono" ? "" : client?.phone} className={input} placeholder="+34 900 000 000" /></label><label className="block text-sm">Móvil<input name="mobile" defaultValue={client?.mobile} className={input} placeholder="+34 600 000 000" /></label><label className="block text-sm sm:col-span-2">Dirección<input name="address" defaultValue={client?.address} className={input} placeholder="Calle, número y código postal" /></label><label className="block text-sm">Población<input name="city" defaultValue={client?.city} className={input} /></label><label className="block text-sm">Provincia<input name="province" defaultValue={client?.province} className={input} /></label><label className="block text-sm sm:col-span-2">Notas<textarea name="notes" defaultValue={client?.notes} className={`${input} min-h-24 resize-y`} placeholder="Observaciones comerciales o de contacto" /></label></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm text-muted hover:bg-surface-hover">Cancelar</button><button className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground">{client ? "Guardar cambios" : "Crear cliente"}</button></div></form></div>;
}

function ModuleView({ section, onAction }: { section: Section; onAction: () => void }) {
  const blocks: Partial<Record<Section, [string, string, string][]>> = {
    Presupuestos: [],
    Pedidos: [],
    Compras: [],
    Almacén: [],
    Informes: [],
    Configuración: [["Empresa", "Datos fiscales y numeración", "Configurar"], ["Catálogo", "Productos, familias y tarifas", "Gestionar"], ["Usuarios", "Roles y accesos", "Gestionar"]],
  };
  const rows = blocks[section] ?? [];
  return <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]"><article className="rounded-xl border border-line bg-surface-raised"><div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="font-semibold">{section}</h2><p className="mt-1 text-sm text-muted">Gestión de datos de tu empresa.</p></div><button onClick={onAction} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-accent hover:bg-surface-hover">Gestionar</button></div><div className="divide-y divide-line">{rows.map(([title, meta, status]) => <div key={title} className="flex items-center justify-between gap-4 p-5"><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted">{meta}</p></div><span className="rounded-full bg-surface px-2.5 py-1 text-xs text-[#d6dfd3]">{status}</span></div>)}{rows.length === 0 && <p className="p-12 text-center text-sm text-muted">Todavía no hay registros para mostrar.</p>}</div></article><aside className="rounded-xl border border-line bg-primary p-6"><p className="text-xs font-bold tracking-wider text-accent">INFORMACIÓN</p><h2 className="mt-3 text-xl font-semibold">Datos protegidos por empresa</h2><p className="mt-3 text-sm leading-6 text-white/70">Las operaciones se realizan en Supabase con reglas de acceso por organización y perfiles de usuario.</p><button onClick={onAction} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground">Gestionar módulo <ArrowUpRight className="size-4" /></button></aside></div>;
}
