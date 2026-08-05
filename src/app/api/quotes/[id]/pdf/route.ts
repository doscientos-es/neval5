import PDFDocument from "pdfkit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function euro(value: number) { return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value); }

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return Response.json({ error: "Servicio no configurado" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { data: quote, error } = await supabase.from("quotes").select("organization_id, number, customer_name_snapshot, customer_address_snapshot, company_name_snapshot, company_tax_id_snapshot, company_address_snapshot, company_email_snapshot, company_phone_snapshot, notes, subtotal, tax_total, total, created_at, quote_lines(description_snapshot, quantity, unit, unit_price, discount_pct, tax_rate_snapshot, line_total)").eq("id", id).maybeSingle();
  if (error || !quote) return Response.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  const { data: organization } = await supabase.from("organizations").select("name, tax_id, address, city, province, email, phone").eq("id", quote.organization_id).maybeSingle();
  const company = { name: quote.company_name_snapshot || organization?.name || "NEVAL 5", taxId: quote.company_tax_id_snapshot || organization?.tax_id || "", address: quote.company_address_snapshot || [organization?.address, organization?.city, organization?.province].filter(Boolean).join(", "), email: quote.company_email_snapshot || organization?.email || "", phone: quote.company_phone_snapshot || organization?.phone || "" };

  const pdf = new PDFDocument({ size: "A4", margin: 48, info: { Title: quote.number, Author: "NEVAL 5" } });
  const chunks: Buffer[] = []; pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => { pdf.on("end", () => resolve(Buffer.concat(chunks))); pdf.on("error", reject); });
  pdf.fillColor("#2a4227").fontSize(25).font("Helvetica-Bold").text(company.name);
  pdf.fillColor("#667066").fontSize(8).font("Helvetica").text([company.taxId, company.address, company.email, company.phone].filter(Boolean).join(" · "), { width: 270 });
  pdf.fillColor("#171717").fontSize(10).font("Helvetica").text("Presupuesto", { align: "right" });
  pdf.font("Helvetica-Bold").fontSize(16).text(quote.number, { align: "right" });
  pdf.moveDown(3).fillColor("#2a4227").font("Helvetica-Bold").fontSize(10).text("CLIENTE");
  pdf.fillColor("#171717").font("Helvetica").text(quote.customer_name_snapshot); if (quote.customer_address_snapshot) pdf.text(quote.customer_address_snapshot);
  pdf.text(new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date(quote.created_at)), { align: "right" });
  pdf.moveDown(2).font("Helvetica-Bold").fontSize(9).fillColor("#2a4227").text("CONCEPTO", 48).text("CANT.", 320, pdf.y - 11).text("PRECIO", 390, pdf.y - 11).text("IMPORTE", 470, pdf.y - 11);
  pdf.moveTo(48, pdf.y + 5).lineTo(547, pdf.y + 5).strokeColor("#bdff7b").stroke(); pdf.moveDown(1);
  quote.quote_lines.forEach((line) => { const y = pdf.y; pdf.fillColor("#171717").font("Helvetica").fontSize(9).text(line.description_snapshot, 48, y, { width: 260 }).text(`${line.quantity} ${line.unit}`, 320, y, { width: 55, align: "right" }).text(euro(Number(line.unit_price)), 390, y, { width: 65, align: "right" }).text(euro(Number(line.line_total)), 470, y, { width: 77, align: "right" }); pdf.moveDown(1.2); });
  pdf.moveDown(2).moveTo(340, pdf.y).lineTo(547, pdf.y).strokeColor("#d7ddd5").stroke(); pdf.moveDown(.7);
  const totals = [["Base imponible", quote.subtotal], ["IVA", quote.tax_total], ["TOTAL", quote.total]] as const;
  totals.forEach(([label, amount], index) => { pdf.fillColor(index === 2 ? "#2a4227" : "#171717").font(index === 2 ? "Helvetica-Bold" : "Helvetica").fontSize(index === 2 ? 13 : 10).text(label, 365, pdf.y, { width: 90, align: "right" }).text(euro(Number(amount)), 470, pdf.y - (index === 2 ? 15 : 12), { width: 77, align: "right" }); pdf.moveDown(.8); });
  if (quote.notes) { pdf.moveDown(2).fillColor("#2a4227").font("Helvetica-Bold").fontSize(10).text("OBSERVACIONES"); pdf.fillColor("#171717").font("Helvetica").fontSize(9).text(quote.notes); }
  pdf.fillColor("#667066").fontSize(8).text(`Documento generado por ${company.name}`, 48, 780, { align: "center", width: 499 }); pdf.end();
  const body = await finished;
  return new Response(new Uint8Array(body), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${quote.number}.pdf"`, "Cache-Control": "no-store" } });
}
