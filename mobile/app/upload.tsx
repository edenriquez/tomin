import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import { api } from "@/lib/api";
import { ExtractedPayload, extractDocument, extractionMessage } from "@/lib/extract";
import {
    AlreadyProcessedError,
    IngestResponse,
    KeyPinMismatchError,
    sendExtracted,
    trustServerKey,
} from "@/lib/secure-transport";
import {
    listStatements,
    markProcessed,
    markUnprocessed,
    storeStatement,
    StoredStatement,
} from "@/lib/storage";

type UploadResult = {
    filename: string;
    template: string;
    transactionsCreated: number;
    dashboardUrl: string;
};

export default function UploadScreen() {
    const [items, setItems] = useState<StoredStatement[]>([]);
    const [phase, setPhase] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [result, setResult] = useState<UploadResult | null>(null);

    /** Kept so a key-rotation prompt can resume the send without re-reading. */
    const pending = useRef<{ payload: ExtractedPayload; storedId: string } | null>(null);

    async function refresh() {
        setItems(await listStatements());
    }

    useEffect(() => {
        refresh();
    }, []);

    async function pickAndProcess() {
        const picked = await DocumentPicker.getDocumentAsync({
            type: ["application/pdf", "text/xml", "application/xml"],
            copyToCacheDirectory: true,
        });
        if (picked.canceled) return;

        const asset = picked.assets[0];
        setResult(null);
        setStatus(null);

        // 1. The durable copy lands on the phone first, and stays there.
        setPhase("Guardando en tu teléfono…");
        const stored = await storeStatement(
            asset.uri,
            asset.name,
            asset.mimeType ?? "application/octet-stream"
        );
        await refresh();

        // 2. The custody beat: extraction happens here, not on a server.
        setPhase("Leyendo en tu teléfono…");
        let payload: ExtractedPayload;
        try {
            payload = await extractDocument(stored.localUri, stored.name, stored.mimeType);
        } catch (e) {
            setPhase(null);
            setStatus(extractionMessage(e));
            return;
        }

        await sealAndSend(payload, stored.id, stored.name);
    }

    async function sealAndSend(payload: ExtractedPayload, storedId: string, filename: string) {
        pending.current = { payload, storedId };
        setPhase("Enviando cifrado…");
        try {
            const res: IngestResponse = await sendExtracted(payload);
            await markProcessed(storedId, res.statement_id);
            await refresh();
            setPhase(null);
            setStatus(null);
            setResult({
                filename,
                template: res.template,
                transactionsCreated: res.transactions_created,
                dashboardUrl: res.dashboard_url,
            });
            pending.current = null;
        } catch (e) {
            setPhase(null);
            if (e instanceof KeyPinMismatchError) {
                promptKeyRotation(e, filename);
                return;
            }
            if (e instanceof AlreadyProcessedError) {
                setStatus("Este archivo ya estaba procesado. No se envió nada nuevo.");
                pending.current = null;
                return;
            }
            setStatus(`Guardado en tu teléfono. No se pudo enviar: ${(e as Error).message}`);
        }
    }

    function promptKeyRotation(error: KeyPinMismatchError, filename: string) {
        setStatus(
            "La llave pública del servidor cambió. No envié nada: así se ve un intento de intercepción."
        );
        Alert.alert(
            "La llave del servidor cambió",
            `Tenía fijada la llave "${error.pinned.key_id}" desde ${new Date(
                error.pinned.pinned_at
            ).toLocaleDateString()} y ahora el servidor ofrece "${error.offered.key_id}".\n\n` +
                "Si no esperabas una rotación de llaves, cancela: alguien podría estar en medio.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confiar en la nueva llave",
                    style: "destructive",
                    onPress: async () => {
                        await trustServerKey(error.offered);
                        const job = pending.current;
                        if (job) await sealAndSend(job.payload, job.storedId, filename);
                    },
                },
            ]
        );
    }

    async function openDashboard(url: string) {
        try {
            await Linking.openURL(url);
        } catch {
            setStatus(`No pude abrir el link. Cópialo a mano: ${url}`);
        }
    }

    async function shareDashboard(res: UploadResult) {
        try {
            await Share.share({
                message: `${res.transactionsCreated} movimientos de ${res.filename} en Tomin: ${res.dashboardUrl}`,
                url: res.dashboardUrl,
            });
        } catch {
            /* user dismissed the sheet */
        }
    }

    function confirmDelete(item: StoredStatement) {
        Alert.alert(
            "Eliminar del servidor",
            `Se borraran los movimientos extraidos de "${item.name}". El archivo se queda en tu telefono.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => deleteRemote(item),
                },
            ]
        );
    }

    async function deleteRemote(item: StoredStatement) {
        if (!item.remoteId) return;
        setPhase("Eliminando del servidor…");
        try {
            const res = await api.deleteStatement(item.remoteId);
            await markUnprocessed(item.id);
            await refresh();
            setPhase(null);
            setStatus(`Eliminados ${res.transactions_deleted} movimientos del servidor.`);
        } catch (e) {
            setPhase(null);
            setStatus(`No se pudo eliminar: ${(e as Error).message}`);
        }
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.subtle}>
                Tu archivo se queda en el teléfono. Aquí mismo se lee y solo el texto extraído
                viaja, cifrado de punta a punta con la llave del servidor. El PDF nunca sale.
            </Text>

            <TouchableOpacity
                style={[styles.primaryBtn, phase ? styles.primaryBtnDisabled : null]}
                onPress={pickAndProcess}
                disabled={phase !== null}
            >
                <Text style={styles.primaryBtnText}>Seleccionar PDF o XML (SAT)</Text>
            </TouchableOpacity>

            {phase && (
                <View style={styles.phaseRow}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.phaseText}>{phase}</Text>
                </View>
            )}

            {status && <Text style={styles.status}>{status}</Text>}

            {result && (
                <View style={styles.resultCard}>
                    <Text style={styles.resultTitle}>Listo</Text>
                    <Text style={styles.resultBig}>{result.transactionsCreated} movimientos</Text>
                    <Text style={styles.subtle}>
                        {result.filename} · formato {result.template}
                    </Text>
                    <Text style={styles.custodyNote}>
                        El archivo original sigue solo en este teléfono.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => openDashboard(result.dashboardUrl)}
                    >
                        <Text style={styles.primaryBtnText}>Ver en tu dashboard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => shareDashboard(result)}>
                        <Text style={styles.secondaryBtnText}>Compartir link</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Text style={styles.sectionTitle}>Archivos guardados</Text>
            {items.map((s) => (
                <View key={s.id} style={styles.fileRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fileName}>{s.name}</Text>
                        <Text style={styles.subtle}>{new Date(s.storedAt).toLocaleString()}</Text>
                    </View>
                    <Text style={s.processed ? styles.done : styles.pending}>
                        {s.processed ? "Procesado" : "Pendiente"}
                    </Text>
                    {s.remoteId && (
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => confirmDelete(s)}
                            accessibilityLabel={`Eliminar ${s.name} del servidor`}
                        >
                            <Text style={styles.deleteBtnText}>Eliminar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ))}
            {items.length === 0 && <Text style={styles.subtle}>Aun no hay archivos.</Text>}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f8fafc" },
    subtle: { color: "#64748b", fontSize: 13 },
    primaryBtn: {
        backgroundColor: "#2563eb",
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
        marginTop: 16,
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: { color: "#fff", fontWeight: "600" },
    secondaryBtn: {
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    secondaryBtnText: { color: "#334155", fontWeight: "600" },
    phaseRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
    phaseText: { color: "#0f172a" },
    status: { marginTop: 12, color: "#0f172a" },
    resultCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    resultTitle: { color: "#059669", fontWeight: "700", fontSize: 13 },
    resultBig: { fontSize: 24, fontWeight: "700", marginTop: 2 },
    custodyNote: { color: "#059669", fontSize: 12, marginTop: 8 },
    sectionTitle: { fontWeight: "700", marginTop: 24, fontSize: 16, marginBottom: 8 },
    fileRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    fileName: { fontWeight: "600" },
    done: { color: "#059669", fontSize: 12 },
    pending: { color: "#94a3b8", fontSize: 12 },
    deleteBtn: {
        marginLeft: 12,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#fecaca",
        backgroundColor: "#fef2f2",
    },
    deleteBtnText: { color: "#dc2626", fontSize: 12, fontWeight: "600" },
});
