"use client";

import { useState } from "react";
import { Download, Inbox, Plus } from "lucide-react";
import {
    Button,
    Card,
    ChartSkeleton,
    type Column,
    ConfirmModal,
    EmptyState,
    Field,
    Input,
    Modal,
    PageHeader,
    Pagination,
    SearchInput,
    Sheet,
    Skeleton,
    Slider,
    StatTile,
    Table,
    TableEmpty,
    TableSkeleton,
    Tabs,
    Tag,
    ToastProvider,
    useToast,
} from "@/components/ui";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { ProjectionChart } from "@/components/charts/ProjectionChart";
import { chart, colors } from "@/design/tokens";
import { compactMxn, monthLabelFromOffset, mxn, mxn2, pct } from "@/lib/format";

const CATEGORIES = [
    { category_id: "a", category_name: "Alimentos", amount: 18400, percentage: 34 },
    { category_id: "b", category_name: "Transporte", amount: 9200, percentage: 17 },
    { category_id: "c", category_name: "Servicios", amount: 7100, percentage: 13 },
    { category_id: "d", category_name: "Entretenimiento", amount: 5300, percentage: 10 },
    { category_id: "e", category_name: "Salud", amount: 4100, percentage: 8 },
    { category_id: "f", category_name: "Ropa", amount: 3000, percentage: 6 },
    { category_id: "g", category_name: "Mascotas", amount: 1800, percentage: 3 },
    { category_id: "h", category_name: "Otros gastos", amount: 900, percentage: 2 },
];

const FORECAST = Array.from({ length: 12 }, (_, i) => ({
    month_offset: i,
    baseline: 10000 + i * 4200,
    optimized: 10000 + i * 4200 * 1.35,
}));

type Row = { id: string; date: string; concept: string; amount: number };

const ROWS: Row[] = [
    { id: "1", date: "2026-07-02", concept: "OXXO SUC 4412", amount: 128.5 },
    { id: "2", date: "2026-07-05", concept: "Netflix México", amount: 299 },
    { id: "3", date: "2026-07-11", concept: "Uber Trip", amount: 84.2 },
];

const COLUMNS: Column<Row>[] = [
    { key: "date", header: "Fecha", cell: (r) => <span className="text-pewter">{r.date}</span> },
    { key: "concept", header: "Concepto", cell: (r) => r.concept },
    { key: "amount", header: "Monto", numeric: true, cell: (r) => mxn2(r.amount) },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="border-t border-mist pt-8">
            <h2 className="mb-4 text-title-sm font-semibold text-ink">{title}</h2>
            {children}
        </section>
    );
}

function Cluster({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export function KitchenSink() {
    return (
        <ToastProvider>
            <Body />
        </ToastProvider>
    );
}

function Body() {
    const { toast } = useToast();
    const [tab, setTab] = useState("todos");
    const [sheetOpen, setSheetOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [savings, setSavings] = useState(15000);
    const [rate, setRate] = useState(0.105);
    const [page, setPage] = useState(1);
    const [query, setQuery] = useState("");

    return (
        <main className="mx-auto max-w-5xl space-y-8 p-8">
            <PageHeader
                title="Kitchen sink"
                subtitle="Every primitive, every state. Dev only."
                actions={
                    <>
                        <Button variant="secondary" icon={<Download size={16} />}>
                            Exportar
                        </Button>
                        <Button icon={<Plus size={16} />}>Nuevo</Button>
                    </>
                }
            />

            <Section title="Type scale">
                <div className="space-y-2">
                    <p className="font-display text-display-lg text-ink">Display 72</p>
                    <p className="font-display text-display-md text-ink">Display 56</p>
                    <p className="text-title-lg font-semibold text-ink">Title 36</p>
                    <p className="text-title-md font-semibold text-ink">Title 24</p>
                    <p className="text-title-sm font-semibold text-ink">Title 18</p>
                    <p className="text-body text-graphite">Body 15 — graphite, 5.94:1</p>
                    <p className="text-body-sm text-graphite">Body small 13</p>
                    <p className="text-label text-pewter">Label 12 — pewter, 4.83:1</p>
                    <p className="tabular text-metric font-semibold text-ink">$1,234,567</p>
                </div>
            </Section>

            <Section title="Palette">
                <div className="flex flex-wrap gap-2">
                    {Object.entries(colors).map(([name, hex]) => (
                        <div key={name} className="w-28">
                            <div
                                className="h-12 rounded-control border border-mist"
                                style={{ background: hex }}
                            />
                            <div className="mt-1 text-label text-pewter">{name}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex gap-1">
                    {chart.neutral.map((c) => (
                        <div key={c} className="h-8 flex-1 rounded-tag" style={{ background: c }} />
                    ))}
                </div>
                <div className="mt-1 flex gap-1">
                    {chart.emberTint.map((c) => (
                        <div key={c} className="h-8 flex-1 rounded-tag" style={{ background: c }} />
                    ))}
                </div>
            </Section>

            <Section title="Button">
                <div className="space-y-3">
                    <Cluster>
                        <Button variant="primary">Primary</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="danger">Danger</Button>
                    </Cluster>
                    <Cluster>
                        <Button size="sm">Small</Button>
                        <Button size="md">Medium</Button>
                        <Button size="lg">Large</Button>
                    </Cluster>
                    <Cluster>
                        <Button loading>Guardando cambios</Button>
                        <Button variant="secondary" loading>
                            Guardando cambios
                        </Button>
                        <Button disabled>Disabled</Button>
                        <Button icon={<Plus size={16} />}>Con icono</Button>
                    </Cluster>
                    <Button fullWidth variant="secondary">
                        Full width
                    </Button>
                </div>
            </Section>

            <Section title="Tag">
                <Cluster>
                    <Tag>Neutral</Tag>
                    <Tag tone="estimate">Estimado</Tag>
                    <Tag tone="positive">Procesado</Tag>
                    <Tag tone="negative">Fallido</Tag>
                    <Tag tone="accent">Nuevo</Tag>
                </Cluster>
            </Section>

            <Section title="StatTile">
                <div className="grid gap-4 md:grid-cols-4">
                    <StatTile label="Balance total" value={mxn(120500)} delta="Ingresos - Gastos" />
                    <StatTile
                        label="Gastos del mes"
                        value={mxn(42310)}
                        delta="+12.4% vs junio"
                        tone="negative"
                    />
                    <StatTile
                        label="Ahorro"
                        value={mxn(15000)}
                        delta="+3.1% vs junio"
                        tone="positive"
                        aside={<Tag tone="estimate">Est.</Tag>}
                    />
                    <StatTile label="Sin datos" />
                    <StatTile label="Cargando" loading />
                </div>
            </Section>

            <Section title="Card">
                <div className="grid gap-4 md:grid-cols-2">
                    <Card title="Con título" actions={<Button size="sm" variant="ghost">Ver</Button>}>
                        <p className="text-body-sm text-graphite">Contenido de la tarjeta.</p>
                    </Card>
                    <Card flush title="Flush (para tablas)">
                        <div className="px-6 py-4">
                            <p className="text-body-sm text-graphite">Sin padding propio.</p>
                        </div>
                    </Card>
                </div>
            </Section>

            <Section title="Input / Field / SearchInput">
                <div className="grid max-w-xl gap-4">
                    <Field label="Nombre completo" hint="Como aparece en tu identificación">
                        {(p) => <Input {...p} defaultValue="Alejandro Martínez" />}
                    </Field>
                    <Field label="RFC" error="El RFC debe tener 13 caracteres." required>
                        {(p) => <Input {...p} defaultValue="MARS88" invalid />}
                    </Field>
                    <Field label="Deshabilitado">{(p) => <Input {...p} disabled value="—" />}</Field>
                    <SearchInput onSearch={setQuery} placeholder="Buscar comercio..." />
                    <p className="text-label text-pewter">Última búsqueda: {query || "(vacía)"}</p>
                </div>
            </Section>

            <Section title="Tabs">
                <Tabs
                    aria-label="Ejemplo"
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: "todos", label: "Todos" },
                        { value: "gastos", label: "Gastos" },
                        { value: "ingresos", label: "Ingresos" },
                        { value: "bloqueado", label: "Bloqueado", disabled: true },
                    ]}
                />
                <p className="mt-3 text-body-sm text-graphite">Activo: {tab}</p>
            </Section>

            <Section title="Table">
                <div className="space-y-8">
                    <Card flush title="Con datos">
                        <div className="px-6 pb-4">
                            <Table columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} caption="Movimientos" />
                            <Pagination
                                className="mt-3"
                                page={page}
                                pageSize={3}
                                total={42}
                                onPageChange={setPage}
                            />
                        </div>
                    </Card>
                    <Card flush title="Cargando">
                        <div className="px-6 pb-4">
                            <Table columns={COLUMNS} rows={[]} rowKey={(r) => r.id} loading />
                        </div>
                    </Card>
                    <Card flush title="Vacía">
                        <div className="px-6 pb-4">
                            <Table
                                columns={COLUMNS}
                                rows={[]}
                                rowKey={(r) => r.id}
                                empty={<TableEmpty>Sin movimientos en este periodo.</TableEmpty>}
                            />
                        </div>
                    </Card>
                    <Card title="TableSkeleton (columnas desconocidas)">
                        <TableSkeleton rows={3} columns={4} />
                    </Card>
                </div>
            </Section>

            <Section title="EmptyState">
                <Card>
                    <EmptyState
                        icon={<Inbox size={18} />}
                        title="Aún no hay movimientos"
                        description="Sube un estado de cuenta y Tomin extrae los movimientos."
                        action={<Button size="sm">Subir estado de cuenta</Button>}
                    />
                </Card>
            </Section>

            <Section title="Skeleton">
                <div className="space-y-3">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-8 w-40" />
                    <ChartSkeleton height={180} />
                </div>
            </Section>

            <Section title="Slider">
                <div className="max-w-sm space-y-5">
                    <Slider
                        label="Ahorro mensual"
                        value={savings}
                        min={0}
                        max={30000}
                        step={500}
                        onChange={setSavings}
                        format={mxn}
                    />
                    <Slider
                        label="Rendimiento anual"
                        value={rate}
                        min={0.02}
                        max={0.15}
                        step={0.005}
                        onChange={setRate}
                        format={pct}
                    />
                    <Slider
                        label="Deshabilitado"
                        value={5000}
                        min={0}
                        max={10000}
                        onChange={() => {}}
                        format={mxn}
                        disabled
                    />
                </div>
            </Section>

            <Section title="Overlays">
                <Cluster>
                    <Button variant="secondary" onClick={() => setSheetOpen(true)}>
                        Abrir Sheet
                    </Button>
                    <Button variant="secondary" onClick={() => setModalOpen(true)}>
                        Abrir Modal
                    </Button>
                    <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                        Abrir ConfirmModal
                    </Button>
                </Cluster>
                <Sheet
                    open={sheetOpen}
                    onClose={() => setSheetOpen(false)}
                    title="Catálogo de widgets"
                    description="Escape cierra. Tab no sale del panel."
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={() => setSheetOpen(false)}>Agregar</Button>
                        </>
                    }
                >
                    <div className="space-y-3">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Card key={i}>
                                <p className="text-body-sm text-graphite">Widget {i + 1}</p>
                            </Card>
                        ))}
                    </div>
                </Sheet>
                <Modal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title="Modal centrado"
                    description="El único componente con shadow-float."
                    footer={<Button onClick={() => setModalOpen(false)}>Entendido</Button>}
                />
                <ConfirmModal
                    open={confirmOpen}
                    onClose={() => setConfirmOpen(false)}
                    onConfirm={() => {
                        setConfirmOpen(false);
                        toast("Eliminado.", "positive");
                    }}
                    title="¿Eliminar estado de cuenta?"
                    description="Se eliminarán los movimientos extraídos. Esta acción no se puede deshacer."
                    confirmLabel="Eliminar"
                />
            </Section>

            <Section title="Toast">
                <Cluster>
                    <Button variant="secondary" onClick={() => toast("Guardado.")}>
                        Neutral
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => toast("Se procesaron 128 movimientos.", "positive")}
                    >
                        Positive
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => toast("No se pudo conectar con el backend.", "negative")}
                    >
                        Negative (persiste)
                    </Button>
                </Cluster>
            </Section>

            <Section title="Charts">
                <div className="grid gap-4 md:grid-cols-2">
                    <Card title="ProjectionChart (área + línea)" className="min-w-0">
                        <ProjectionChart points={FORECAST} />
                    </Card>
                    <Card title="DistributionChart (barra horizontal)" className="min-w-0">
                        <DistributionChart
                            data={CATEGORIES.map((c) => ({
                                label: c.category_name,
                                amount: c.amount,
                            }))}
                        />
                    </Card>
                    <Card title="DistributionChart vacío" className="min-w-0">
                        <DistributionChart data={[]} />
                    </Card>
                </div>
            </Section>

            <Section title="Formatters">
                <ul className="space-y-1 text-body-sm text-graphite">
                    <li className="tabular">mxn(1234567) → {mxn(1234567)}</li>
                    <li className="tabular">mxn2(1234.5) → {mxn2(1234.5)}</li>
                    <li className="tabular">compactMxn(1234567) → {compactMxn(1234567)}</li>
                    <li className="tabular">pct(0.105) → {pct(0.105)}</li>
                    <li className="tabular">
                        monthLabelFromOffset(0..3) →{" "}
                        {[0, 1, 2, 3].map((o) => monthLabelFromOffset(o)).join(", ")}
                    </li>
                </ul>
            </Section>
        </main>
    );
}
