import { useCallback, useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { api, mxn, Transaction } from "@/lib/api";
import { ReceiptPayload, readReceipt, receiptMessage } from "@/lib/receipt";
import {
    AlreadyProcessedError,
    KeyPinMismatchError,
    ReceiptResponse,
    ReceiptSuggestion,
    sendReceipt,
    trustServerKey,
} from "@/lib/secure-transport";

/**
 * Photographing a grocery ticket.
 *
 * The custody beat is the same one the statement screen makes, and it is said
 * out loud for the same reason: "Leyendo en tu teléfono…" is not a spinner
 * label, it is the product's central promise happening. The photo is read here,
 * on this device, and only the text it yielded is sealed and sent.
 *
 * What comes back is a basket. The interesting state is the one where the
 * backend could not decide which movement it belongs to — two charges of the
 * same amount on the same day — and the screen then asks instead of guessing,
 * showing each candidate with the reason it scored.
 */
export default function ReceiptScreen() {
    const [phase, setPhase] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [result, setResult] = useState<ReceiptResponse | null>(null);
    /** Recent expenses, loaded only when the user asks to pick one by hand. */
    const [expenses, setExpenses] = useState<Transaction[] | null>(null);
    const [attaching, setAttaching] = useState(false);

    useFocusEffect(
        useCallback(() => {
            // A ticket sent on a previous visit is done with; the screen opens
            // on the camera, not on last week's groceries.
            return () => setExpenses(null);
        }, [])
    );

    async function capture(source: "camera" | "library") {
        const permission =
            source === "camera"
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setStatus(
                source === "camera"
                    ? "Necesito permiso de cámara para leer el ticket aquí mismo."
                    : "Necesito permiso para abrir tus fotos."
            );
            return;
        }

        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            // Cropping first is what makes a long ticket readable: the user
            // frames the printed part and the recognizer stops fighting the
            // table it was lying on.
            allowsEditing: true,
            quality: 1,
        };
        const picked =
            source === "camera"
                ? await ImagePicker.launchCameraAsync(options)
                : await ImagePicker.launchImageLibraryAsync(options);
        if (picked.canceled) return;

        setResult(null);
        setExpenses(null);
        setStatus(null);
        await readAndSend(picked.assets[0].uri, picked.assets[0].fileName ?? "ticket.jpg");
    }

    async function readAndSend(uri: string, filename: string) {
        setPhase("Leyendo en tu teléfono…");
        let payload: ReceiptPayload;
        try {
            payload = await readReceipt(uri, filename);
        } catch (e) {
            setPhase(null);
            setStatus(receiptMessage(e));
            return;
        }
        await sealAndSend(payload);
    }

    async function sealAndSend(payload: ReceiptPayload) {
        setPhase("Enviando cifrado…");
        try {
            const res = await sendReceipt(payload);
            setPhase(null);
            setResult(res);
            if (res.receipt.items.length === 0) {
                setStatus("Leí el ticket pero no reconocí ninguna partida. Intenta otra foto.");
            }
        } catch (e) {
            setPhase(null);
            if (e instanceof KeyPinMismatchError) {
                promptKeyRotation(e, payload);
                return;
            }
            if (e instanceof AlreadyProcessedError) {
                setStatus("Esta foto ya estaba procesada. No se envió nada nuevo.");
                return;
            }
            setStatus(`La foto se quedó en tu teléfono. No se pudo enviar: ${(e as Error).message}`);
        }
    }

    function promptKeyRotation(error: KeyPinMismatchError, payload: ReceiptPayload) {
        setStatus(
            "La llave pública del servidor cambió. No envié nada: así se ve un intento de intercepción."
        );
        Alert.alert(
            "La llave del servidor cambió",
            `Tenía fijada la llave "${error.pinned.key_id}" y ahora el servidor ofrece ` +
                `"${error.offered.key_id}".\n\n` +
                "Si no esperabas una rotación de llaves, cancela: alguien podría estar en medio.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confiar en la nueva llave",
                    style: "destructive",
                    onPress: async () => {
                        await trustServerKey(error.offered);
                        await sealAndSend(payload);
                    },
                },
            ]
        );
    }

    async function attach(transactionId: string | null) {
        if (!result) return;
        setAttaching(true);
        try {
            const receipt = await api.attachReceipt(result.receipt_id, transactionId);
            setResult({ ...result, receipt, attached: transactionId !== null, suggestions: [] });
            setExpenses(null);
            setStatus(
                transactionId ? "Listo, el ticket quedó adjunto al movimiento." : null
            );
        } catch (e) {
            setStatus(`No se pudo adjuntar: ${(e as Error).message}`);
        } finally {
            setAttaching(false);
        }
    }

    async function loadExpenses() {
        try {
            const { items } = await api.expenses();
            setExpenses(items.filter((t) => t.type === "expense"));
        } catch (e) {
            setStatus(`No pude leer tus movimientos: ${(e as Error).message}`);
        }
    }

    const receipt = result?.receipt;

    return (
        <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.title}>Foto de un ticket</Text>
            <Text style={styles.subtle}>
                La foto se queda en tu teléfono. Solo viaja el texto que leí de ella, cifrado.
            </Text>

            <TouchableOpacity
                style={[styles.primaryBtn, phase ? styles.primaryBtnDisabled : null]}
                disabled={Boolean(phase)}
                onPress={() => capture("camera")}
            >
                <Text style={styles.primaryBtnText}>Tomar foto del ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.secondaryBtn}
                disabled={Boolean(phase)}
                onPress={() => capture("library")}
            >
                <Text style={styles.secondaryBtnText}>Elegir una foto</Text>
            </TouchableOpacity>

            {phase && (
                <View style={styles.phaseRow}>
                    <ActivityIndicator />
                    <Text style={styles.phaseText}>{phase}</Text>
                </View>
            )}
            {status && <Text style={styles.status}>{status}</Text>}

            {receipt && (
                <View style={styles.resultCard}>
                    <Text style={styles.resultTitle}>TICKET LEÍDO</Text>
                    <Text style={styles.resultBig}>{receipt.store ?? "Tienda no legible"}</Text>
                    <Text style={styles.subtle}>
                        {receipt.purchased_at ?? "sin fecha legible"} ·{" "}
                        {receipt.total !== null ? mxn(receipt.total) : "sin total legible"} ·{" "}
                        {receipt.items.length} partida(s)
                    </Text>

                    {receipt.items.map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                            <Text style={styles.itemName} numberOfLines={1}>
                                {item.description}
                                {item.quantity ? `  ×${item.quantity}` : ""}
                            </Text>
                            <Text style={styles.itemAmount}>{mxn(item.amount)}</Text>
                        </View>
                    ))}

                    {receipt.total !== null &&
                        Math.abs(receipt.items_total - receipt.total) > 0.5 && (
                            <Text style={styles.warning}>
                                Las partidas suman {mxn(receipt.items_total)} y el ticket dice{" "}
                                {mxn(receipt.total)}. Alguna línea no se leyó.
                            </Text>
                        )}

                    <Text style={styles.custodyNote}>
                        La foto sigue en tu teléfono. El servidor solo recibió este texto.
                    </Text>
                </View>
            )}

            {result && !result.attached && (
                <View style={styles.askCard}>
                    <Text style={styles.sectionTitle}>¿A qué movimiento pertenece?</Text>
                    {result.suggestions.length > 0 ? (
                        <>
                            <Text style={styles.subtle}>
                                Encontré más de un movimiento que cuadra. Elige tú: adivinar sería
                                peor.
                            </Text>
                            {result.suggestions.map((s: ReceiptSuggestion) => (
                                <TouchableOpacity
                                    key={s.transaction.id}
                                    style={styles.candidate}
                                    disabled={attaching}
                                    onPress={() => attach(s.transaction.id)}
                                >
                                    <Text style={styles.candidateName} numberOfLines={1}>
                                        {s.transaction.description ?? s.transaction.raw_description}
                                    </Text>
                                    <Text style={styles.subtle}>
                                        {s.transaction.date} · {mxn(s.transaction.amount)} ·{" "}
                                        {s.reason}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </>
                    ) : (
                        <Text style={styles.subtle}>
                            No encontré un movimiento con ese total. Puede que el estado de cuenta
                            todavía no esté subido — el ticket ya quedó guardado y sus precios ya
                            cuentan.
                        </Text>
                    )}

                    {expenses ? (
                        expenses.map((t) => (
                            <TouchableOpacity
                                key={t.id}
                                style={styles.candidate}
                                disabled={attaching}
                                onPress={() => attach(t.id)}
                            >
                                <Text style={styles.candidateName} numberOfLines={1}>
                                    {t.description}
                                </Text>
                                <Text style={styles.subtle}>
                                    {t.date} · {mxn(t.amount)}
                                </Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <TouchableOpacity style={styles.secondaryBtn} onPress={loadExpenses}>
                            <Text style={styles.secondaryBtnText}>Elegir otro movimiento</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {result && (
                <>
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => Linking.openURL(result.prices_url)}
                    >
                        <Text style={styles.secondaryBtnText}>Ver tus precios en la web</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.linkBtn}
                        onPress={() => Share.share({ message: result.prices_url })}
                    >
                        <Text style={styles.subtle}>Compartir el link</Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f8fafc" },
    title: { fontSize: 20, fontWeight: "700" },
    subtle: { color: "#64748b", fontSize: 13, marginTop: 4 },
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
    linkBtn: { alignItems: "center", padding: 8 },
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
    resultBig: { fontSize: 22, fontWeight: "700", marginTop: 2 },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 10,
    },
    itemName: { flex: 1, color: "#0f172a" },
    itemAmount: { fontVariant: ["tabular-nums"], color: "#0f172a" },
    warning: { marginTop: 12, color: "#b45309", fontSize: 12 },
    custodyNote: { color: "#059669", fontSize: 12, marginTop: 12 },
    askCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    sectionTitle: { fontWeight: "700", fontSize: 16 },
    candidate: {
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    candidateName: { fontWeight: "600", color: "#0f172a" },
});
