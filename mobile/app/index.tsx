import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { api, mxn, SpendingSummary } from "@/lib/api";
import { listStatements, StoredStatement } from "@/lib/storage";

export default function DashboardScreen() {
    const router = useRouter();
    const [summary, setSummary] = useState<SpendingSummary | null>(null);
    const [statements, setStatements] = useState<StoredStatement[]>([]);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            api.summary().then(setSummary).catch((e) => setError(e.message));
            listStatements().then(setStatements);
        }, [])
    );

    const balance = summary ? summary.total_income - summary.total_expense : 0;

    return (
        <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.greeting}>Hola, Alejandro</Text>
            <Text style={styles.subtle}>Tu resumen financiero</Text>

            {error && (
                <Text style={styles.error}>
                    No se pudo conectar al backend. Revisa que este corriendo.
                </Text>
            )}

            <View style={styles.card}>
                <Text style={styles.cardLabel}>Balance Total</Text>
                <Text style={styles.cardValue}>{mxn(balance)}</Text>
            </View>

            <View style={styles.row}>
                <View style={[styles.card, styles.flex]}>
                    <Text style={styles.cardLabel}>Gastos</Text>
                    <Text style={styles.cardValueSm}>{mxn(summary?.total_expense ?? 0)}</Text>
                </View>
                <View style={[styles.card, styles.flex]}>
                    <Text style={styles.cardLabel}>Ingresos</Text>
                    <Text style={styles.cardValueSm}>{mxn(summary?.total_income ?? 0)}</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Distribucion de Gastos</Text>
            <View style={styles.card}>
                {summary?.by_category?.length ? (
                    summary.by_category.map((c) => (
                        <View key={c.category_name} style={styles.catRow}>
                            <Text>{c.category_name}</Text>
                            <Text style={styles.subtle}>
                                {mxn(c.amount)} ({c.percentage}%)
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.subtle}>Sube un estado de cuenta para empezar.</Text>
                )}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/upload")}>
                <Text style={styles.primaryBtnText}>+ Subir Estado de Cuenta</Text>
            </TouchableOpacity>
            <Link href="/transactions" style={styles.linkBtn}>
                Ver todas las transacciones
            </Link>

            <Text style={styles.sectionTitle}>En este dispositivo</Text>
            <Text style={styles.subtle}>
                {statements.length} archivo(s) guardado(s) de forma segura en tu telefono.
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f8fafc" },
    greeting: { fontSize: 24, fontWeight: "700" },
    subtle: { color: "#64748b", fontSize: 13 },
    error: { color: "#b45309", backgroundColor: "#fffbeb", padding: 10, borderRadius: 8, marginTop: 8 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    row: { flexDirection: "row", gap: 12 },
    flex: { flex: 1 },
    cardLabel: { color: "#64748b", fontSize: 13 },
    cardValue: { fontSize: 28, fontWeight: "700", marginTop: 4 },
    cardValueSm: { fontSize: 20, fontWeight: "700", marginTop: 4 },
    sectionTitle: { fontWeight: "700", marginTop: 20, fontSize: 16 },
    catRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    primaryBtn: {
        backgroundColor: "#2563eb",
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
        marginTop: 20,
    },
    primaryBtnText: { color: "#fff", fontWeight: "600" },
    linkBtn: { color: "#2563eb", textAlign: "center", marginTop: 12 },
});
