import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { api } from "@/lib/api";
import {
    listStatements,
    markProcessed,
    markUnprocessed,
    storeStatement,
    StoredStatement,
} from "@/lib/storage";

export default function UploadScreen() {
    const [items, setItems] = useState<StoredStatement[]>([]);
    const [status, setStatus] = useState<string | null>(null);

    async function refresh() {
        setItems(await listStatements());
    }

    useEffect(() => {
        refresh();
    }, []);

    async function pickAndProcess() {
        const result = await DocumentPicker.getDocumentAsync({
            type: ["application/pdf", "text/xml", "application/xml"],
            copyToCacheDirectory: true,
        });
        if (result.canceled) return;

        const asset = result.assets[0];
        setStatus("Guardando en el dispositivo...");
        // 1. Store the durable copy on-device (source of truth).
        const stored = await storeStatement(
            asset.uri,
            asset.name,
            asset.mimeType ?? "application/octet-stream"
        );
        await refresh();

        // 2. Upload a transient copy for parsing.
        setStatus("Procesando en el servidor...");
        try {
            const res = await api.uploadStatement(stored.localUri, stored.name, stored.mimeType);
            await markProcessed(stored.id, res.statement_id);
            await refresh();
            setStatus(`Listo: ${res.transactions_created} movimientos (${res.template}).`);
        } catch (e) {
            setStatus(`Guardado localmente. Error al procesar: ${(e as Error).message}`);
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
        setStatus("Eliminando del servidor...");
        try {
            const res = await api.deleteStatement(item.remoteId);
            await markUnprocessed(item.id);
            await refresh();
            setStatus(`Eliminados ${res.transactions_deleted} movimientos del servidor.`);
        } catch (e) {
            setStatus(`No se pudo eliminar: ${(e as Error).message}`);
        }
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.subtle}>
                Tus archivos se guardan de forma segura en el telefono. Solo se envia una copia
                temporal para extraer la informacion; el archivo original nunca se almacena en el
                servidor.
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={pickAndProcess}>
                <Text style={styles.primaryBtnText}>Seleccionar PDF o XML (SAT)</Text>
            </TouchableOpacity>

            {status && <Text style={styles.status}>{status}</Text>}

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
    primaryBtnText: { color: "#fff", fontWeight: "600" },
    status: { marginTop: 12, color: "#0f172a" },
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
