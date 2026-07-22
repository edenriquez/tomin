import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { api, mxn, Transaction } from "@/lib/api";

export default function TransactionsScreen() {
    const [items, setItems] = useState<Transaction[]>([]);

    useEffect(() => {
        api.transactions()
            .then((r) => setItems(r.items))
            .catch(() => setItems([]));
    }, []);

    return (
        <FlatList
            style={styles.screen}
            contentContainerStyle={{ padding: 16 }}
            data={items}
            keyExtractor={(t) => t.id}
            ListEmptyComponent={<Text style={styles.subtle}>No hay transacciones.</Text>}
            renderItem={({ item }) => (
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.desc}>{item.description}</Text>
                        <Text style={styles.subtle}>{item.date}</Text>
                    </View>
                    <Text style={item.type === "income" ? styles.income : styles.expense}>
                        {item.type === "expense" ? "-" : "+"}
                        {mxn(item.amount)}
                    </Text>
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#f8fafc" },
    subtle: { color: "#64748b", fontSize: 13 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    desc: { fontWeight: "600" },
    income: { color: "#059669", fontWeight: "600" },
    expense: { color: "#0f172a", fontWeight: "600" },
});
