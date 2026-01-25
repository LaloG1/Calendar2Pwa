// app/(tabs)/employees.tsx
import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy as fbOrderBy,
  onSnapshot,
  query,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../src/firebase/firebase";

import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

type Employee = {
  id: string;
  number: number;
  name: string;
};

export default function EmployeesScreen() {
  // Datos
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // UI / filtros
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modal add (solo agregar, no editar)
  const [modalVisible, setModalVisible] = useState(false);
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  // Ordenamiento
  const [sortBy, setSortBy] = useState<"index" | "number" | "name">("index");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // -------------------------
  //  Firestore: lectura en tiempo real
  // -------------------------
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "employees"), fbOrderBy("number", "asc"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as { number: number; name: string }),
        })) as Employee[];

        setEmployees(list);
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot error:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  // -------------------------
  //  Filtrado por búsqueda
  // -------------------------
  const filtered = useMemo(() => {
    if (!search) return employees;
    const s = search.toLowerCase();
    return employees.filter(
      (e) =>
        String(e.number).toLowerCase().includes(s) ||
        (e.name || "").toLowerCase().includes(s),
    );
  }, [employees, search]);

  // -------------------------
  //  Ordenamiento cliente
  // -------------------------
  const sorted = useMemo(() => {
    const arr = [...filtered].map((item, i) => ({ ...item, index: i + 1 }));
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      if (sortBy === "index") return (a.index - b.index) * dir;
      if (sortBy === "number") return (a.number - b.number) * dir;
      return a.name.localeCompare(b.name) * dir;
    });

    return arr.map((item, idx) => ({ ...item, index: idx + 1 }));
  }, [filtered, sortBy, sortDir]);

  // -------------------------
  //  Guardar (solo Agregar)
  // -------------------------
  const openAddModal = () => {
    setEmployeeName("");
    setEmployeeNumber("");
    setModalVisible(true);
  };

  const saveEmployee = async () => {
    if (!employeeNumber || !employeeName) {
      Alert.alert("Error", "Completa número y nombre.");
      return;
    }

    const payload = {
      number: Number(employeeNumber),
      name: employeeName.trim(),
    };

    try {
      await addDoc(collection(db, "employees"), payload);
      Alert.alert("Éxito", "Empleado agregado correctamente.");

      // Cerrar modal + reset
      setModalVisible(false);
      setEmployeeName("");
      setEmployeeNumber("");
    } catch (err) {
      console.error("saveEmployee error:", err);
      Alert.alert("Error", "No se pudo guardar. Revisa la consola.");
    }
  };

  // -------------------------
  //  Eliminar con confirmación
  // -------------------------
  const confirmDelete = (id: string) => {
    Alert.alert("Eliminar empleado", "¿Deseas eliminar este registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => deleteEmployee(id),
      },
    ]);
  };

  const deleteEmployee = async (id: string) => {
    try {
      await deleteDoc(doc(db, "employees", id));
    } catch (err) {
      console.error("deleteEmployee error:", err);
      Alert.alert("Error", "No se pudo eliminar.");
    }
  };

  // -------------------------
  //  Ordenar encabezados
  // -------------------------
  const toggleSort = (col: "index" | "number" | "name") => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
    setPage(1);
  };

  // -------------------------
  //  Exportar a Excel
  // -------------------------
  const exportToExcel = async (data: Employee[]) => {
    try {
      const exportData = data.map((d, i) => ({
        ID: i + 1,
        Número: d.number,
        Nombre: d.name,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Empleados");

      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      const fileName = `empleados_${Date.now()}.xlsx`;
      const uri = (FileSystem as any).cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: (FileSystem as any).EncodingType?.Base64 ?? "base64",
      });

      await Sharing.shareAsync(uri, {
        mimeType:
          Platform.OS === "android"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/octet-stream",
        dialogTitle: "Exportar empleados (Excel)",
      });
    } catch (err) {
      console.error("exportToExcel error:", err);
      Alert.alert("Error", "No se pudo exportar a Excel.");
    }
  };

  // -------------------------
  //  Exportar a PDF
  // -------------------------
  const exportToPDF = async (data: Employee[]) => {
    try {
      const htmlRows = data
        .map(
          (d, i) =>
            `<tr>
              <td style="padding:6px;border:1px solid #ccc">${i + 1}</td>
              <td style="padding:6px;border:1px solid #ccc">${d.number}</td>
              <td style="padding:6px;border:1px solid #ccc">${d.name}</td>
            </tr>`,
        )
        .join("");

      const html = `
        <html>
          <head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;padding:10px;}table{border-collapse:collapse;width:100%;}th{background:#4e73df;color:white;padding:8px;text-align:center;}td{text-align:center;}</style></head>
          <body>
            <h2>Empleados</h2>
            <table>
              <thead><tr><th>ID</th><th>Número</th><th>Nombre</th></tr></thead>
              <tbody>${htmlRows}</tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Exportar empleados (PDF)",
      });
    } catch (err) {
      console.error("exportToPDF error:", err);
      Alert.alert("Error", "No se pudo exportar a PDF.");
    }
  };

  const handleExport = async (type: "excel" | "pdf") => {
    const dataToExport = sorted.map((s) => ({
      id: s.id,
      number: s.number,
      name: s.name,
    }));
    if (dataToExport.length === 0) {
      Alert.alert("Nada para exportar");
      return;
    }
    if (type === "excel") await exportToExcel(dataToExport);
    else await exportToPDF(dataToExport);
  };

  // -------------------------
  //  Render
  // -------------------------
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Empleados</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() =>
              Alert.alert("Exportar", "Selecciona formato", [
                { text: "Excel (.xlsx)", onPress: () => handleExport("excel") },
                { text: "PDF (.pdf)", onPress: () => handleExport("pdf") },
                { text: "Cancelar", style: "cancel" },
              ])
            }
          >
            <Ionicons name="download-outline" size={18} color="white" />
            <Text style={styles.exportText}>Exportar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Ionicons name="add-circle-outline" size={18} color="white" />
            <Text style={styles.addText}>Agregar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Buscar por nombre o número..."
        placeholderTextColor="#000000ff"
        style={styles.searchInput}
        value={search}
        onChangeText={(t) => {
          setSearch(t);
          setPage(1);
        }}
      />

      {/* Tabla headers */}
      <View style={styles.tableHeader}>
        <TouchableOpacity
          style={[styles.th, styles.colId]}
          onPress={() => toggleSort("index")}
        >
          <View style={styles.thContent}>
            <Text style={styles.thText}>ID</Text>
            {sortBy === "index" && <SortIcon dir={sortDir} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.th}
          onPress={() => toggleSort("number")}
        >
          <View style={styles.thContent}>
            <Text style={styles.thText}>Número</Text>
            {sortBy === "number" && <SortIcon dir={sortDir} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.th, { flex: 2 }]}
          onPress={() => toggleSort("name")}
        >
          <View style={styles.thContent}>
            <Text style={styles.thText}>Nombre</Text>
            {sortBy === "name" && <SortIcon dir={sortDir} />}
          </View>
        </TouchableOpacity>

        <View style={[styles.th, { alignItems: "center" }]}>
          <Text style={styles.thText}>Acción</Text>
        </View>
      </View>

      <View style={{ flex: 1, marginTop: 8 }}>
        {/* Lista paginada */}
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => (
            <Text style={{ padding: 20 }}>No hay empleados</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.colId]}>{item.index}</Text>

              <Text style={styles.cell}>{item.number}</Text>
              <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>
              <View style={styles.actions}>
                {/* ✅ SOLO ELIMINAR — botón de editar REMOVIDO */}
                <TouchableOpacity
                  onPress={() => confirmDelete(item.id)}
                  style={styles.iconBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* Modal Agregar */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nuevo empleado</Text>

            <TextInput
              placeholder="Número de empleado"
              value={employeeNumber}
              onChangeText={setEmployeeNumber}
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              placeholder="Nombre"
              value={employeeName}
              onChangeText={setEmployeeName}
              style={styles.input}
            />

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEmployee}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SortIcon({ dir }: { dir: "asc" | "desc" }) {
  return (
    <Ionicons
      name={dir === "asc" ? "chevron-up-outline" : "chevron-down-outline"}
      size={16}
      color="#333"
      style={{ marginLeft: 6 }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 40,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  exportBtn: {
    backgroundColor: "#2f855a",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  exportText: { color: "white", marginLeft: 6, fontWeight: "600" },
  addBtn: {
    backgroundColor: "#4e73df",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  addText: { color: "white", marginLeft: 6, fontWeight: "600" },
  searchInput: {
    backgroundColor: "#f2f2f6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eef2ff",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  th: { flex: 1, paddingHorizontal: 4 },
  thContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // ✅ CENTRADO
  },

  thText: {
    fontWeight: "700",
    textAlign: "center",
    width: "100%", // ✅ fuerza centrado real
  },

  row: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  cell: { flex: 1, textAlign: "center" },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    width: 60, // reducido porque solo hay un botón
  },
  iconBtn: { padding: 6 },
  modalBg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalBox: {
    width: "92%",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  input: {
    backgroundColor: "#f2f2f6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: "#2f855a",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  saveText: { color: "white", fontWeight: "700" },
  cancelBtn: {
    backgroundColor: "#e2e8f0",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  cancelText: { color: "#111", fontWeight: "600" },
  colId: {
    width: 40, // ✅ angosto
    textAlign: "center",
  },
});
