import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { db } from "../../src/firebase/firebase";

import { Asset } from "expo-asset";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import * as Print from "expo-print";
import { Alert } from "react-native";
import * as XLSX from "xlsx";

import logo from "../../assets/images/1212.png";

/* ---------------- TIPOS ---------------- */

type Employee = {
  id: string;
  number: number;
  name: string;
  exception?: boolean;
  exceptionReason?: string | null;
};

type CalendarData = Record<
  string,
  {
    employees: Employee[];
  }
>;

type ReportType = "day" | "range" | "week";

/* ---------------- COMPONENTE ---------------- */

export default function ReportesScreen() {
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [reportType, setReportType] = useState<ReportType>("day");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rangeDates, setRangeDates] = useState<string[]>([]);
  const [confirmedDates, setConfirmedDates] = useState<string[]>([]);

  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);

  const getSafeDirectory = () => {
    if (FileSystem.documentDirectory) {
      return FileSystem.documentDirectory;
    }

    if (FileSystem.cacheDirectory) {
      return FileSystem.cacheDirectory;
    }

    // ⚠️ Expo Go / Web fallback
    console.warn("Usando fallback temporal (Expo Go / Web)");
    return FileSystem.cacheDirectory ?? "";
  };

  const saveToDownloads = async (fileUri: string, fileName: string) => {
    try {
      const sourceInfo = await FileSystem.getInfoAsync(fileUri);
      if (!sourceInfo.exists) {
        throw new Error("El archivo fuente no existe.");
      }

      const mimeType = getMimeType(fileName);

      const shareableUri = fileUri;

      Alert.alert(
        "Exportar reporte",
        `¿Deseas guardar o compartir el archivo "${fileName}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Compartir",
            onPress: async () => {
              await Sharing.shareAsync(shareableUri, {
                mimeType,
                dialogTitle: "Guardar reporte",
              });
            },
          },
        ],
      );

      if (Platform.OS === "android") {
        Alert.alert(
          "Guardar en Descargas",
          '1. Selecciona una app como:\n   • Archivos de Google\n   • Gestor de archivos\n   • Descargas\n2. Luego elige la carpeta "Descargas".\n3. Toca "Guardar".',
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Continuar",
              onPress: async () => {
                try {
                  await Sharing.shareAsync(shareableUri, {
                    mimeType,
                    dialogTitle: "Guardar reporte",
                  });
                } catch (e: any) {
                  console.warn("Sharing falló:", e.message);
                  Alert.alert("Error", "No se pudo compartir el archivo.");
                }
              },
            },
          ],
        );
      } else if (Platform.OS === "ios") {
        await Sharing.shareAsync(shareableUri, {
          mimeType,
          UTI: getUTI(mimeType),
        });
      }
    } catch (error: any) {
      console.error("[saveToDownloads] Error:", error);
      Alert.alert("Error", error.message || "No se pudo iniciar el guardado.");
    }
  };

  // Fallback: guardar en caché interno y mostrar ruta
  const saveToInternalCache = async (fileUri: string, fileName: string) => {
    if (!FileSystem.cacheDirectory) {
      throw new Error("cacheDirectory no disponible");
    }

    const destPath = `${FileSystem.cacheDirectory}Download/${fileName}`;
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.cacheDirectory}Download/`,
      { intermediates: true },
    );
    await FileSystem.copyAsync({ from: fileUri, to: destPath });

    const appId = Constants.expoConfig?.android?.package || "com.example.app";
    const instructions =
      Platform.OS === "android"
        ? `Para acceder al archivo:\n\n1. Abre un gestor de archivos (ej. "Archivos de Google").\n2. Ve a:\n   Interno → Android → data → ${appId} → cache → Download\n3. Copia o comparte el archivo desde allí.`
        : 'El archivo se guardó temporalmente. Usa "Compartir" para guardarlo permanentemente.';

    Alert.alert(
      "✅ Guardado (interno)",
      `Nombre: ${fileName}\n\n${instructions}`,
      [
        { text: "OK", style: "default" },
        Platform.OS === "android"
          ? {
              text: "Abrir carpeta",
              style: "default",
              onPress: () => {
                // Opcional: abrir la carpeta con Linking (requiere URI file://, pero no siempre funciona)
                // Por ahora solo informamos.
              },
            }
          : null,
      ].filter(Boolean) as {
        text: string;
        style: "default" | "cancel";
        onPress?: () => void;
      }[],
    );
  };

  // MIME type helper
  const getMimeType = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      pdf: "application/pdf",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    return map[ext || ""] || "application/octet-stream";
  };

  // UTI para iOS
  const getUTI = (mimeType: string): string | undefined => {
    if (mimeType === "application/pdf") return "com.adobe.pdf";
    if (mimeType.startsWith("image/")) return "public.image";
    if (mimeType === "text/csv") return "public.comma-separated-values-text";
    return undefined;
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year.slice(-2)}`;
  };

  const getLogoUri = async () => {
    const asset = Asset.fromModule(logo);
    await asset.downloadAsync();
    return asset.localUri!;
  };

  // Obtener todos los empleados únicos
  const allEmployees = useMemo(() => {
    const employeesMap = new Map<string, Employee>();

    Object.values(calendarData).forEach((day) => {
      day.employees?.forEach((emp) => {
        if (!employeesMap.has(emp.id)) {
          employeesMap.set(emp.id, emp);
        }
      });
    });

    return Array.from(employeesMap.values());
  }, [calendarData]);

  // Filtrar empleados según la búsqueda
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return [];

    return allEmployees
      .filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.number.toString().includes(searchQuery),
      )
      .slice(0, 5);
  }, [searchQuery, allEmployees]);

  const getDatesBetween = (start: string, end: string) => {
    const dates: string[] = [];
    let current = new Date(start);
    const last = new Date(end);

    while (current <= last) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const reportResults = useMemo(() => {
    if (confirmedDates.length === 0) return [];

    const map: Record<
      string,
      {
        id: string;
        number: number;
        name: string;
        dates: string[];
      }
    > = {};

    confirmedDates.forEach((date) => {
      const dayData = calendarData[date];
      if (!dayData?.employees) return;

      dayData.employees.forEach((emp: any) => {
        if (selectedEmployee && emp.id !== selectedEmployee.id) return;

        if (!map[emp.id]) {
          map[emp.id] = {
            id: emp.id,
            number: emp.number,
            name: emp.name,
            dates: [],
          };
        }

        map[emp.id].dates.push(date);
      });
    });

    return Object.values(map).map((e) => ({
      ...e,
      dates: e.dates.sort((a, b) => (a < b ? 1 : -1)),
    }));
  }, [confirmedDates, calendarData, selectedEmployee]);

  const handleExport = async (type: "excel" | "pdf") => {
    if (reportResults.length === 0) {
      Alert.alert("Nada para exportar", "No hay datos en el reporte.");
      return;
    }

    try {
      const baseDir = getSafeDirectory();

      if (!baseDir) {
        Alert.alert(
          "Exportación no disponible",
          "Esta función requiere un dispositivo físico.",
        );
        return;
      }

      const timestamp = Date.now();
      const fileName = `reporte_${timestamp}.${
        type === "excel" ? "xlsx" : "pdf"
      }`;

      const fileUri = `${baseDir}${fileName}`;

      const exportData = reportResults.map((r, i) => ({
        ID: i + 1,
        Número: r.number,
        Nombre: r.name,
        Fechas: r.dates.map(formatDate).join(", "),
        Días: r.dates.length,
      }));

      /* ================= EXCEL ================= */
      if (type === "excel") {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");

        const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: "base64",
        });

        await Sharing.shareAsync(fileUri, {
          mimeType: getMimeType(fileName),
          dialogTitle: "Guardar reporte Excel",
        });

        return;
      }

      /* ================= PDF ================= */
      const logoUri = await getLogoUri();

      const rows = exportData
        .map(
          (r) => `
        <tr>
          <td>${r.ID}</td>
          <td>${r.Número}</td>
          <td>${r.Nombre}</td>
          <td>${r.Fechas}</td>
          <td>${r.Días}</td>
        </tr>`,
        )
        .join("");

      const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
            th { background: #2563eb; color: white; }
          </style>
        </head>
        <body>
          <img src="${logoUri}" width="80" />
          <h2>Reporte de vacaciones</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>N°</th><th>Nombre</th><th>Fechas</th><th>Días</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

      const { uri: pdfUri } = await Print.printToFileAsync({ html });

      const shareUri =
        Platform.OS === "android"
          ? await FileSystem.getContentUriAsync(pdfUri)
          : pdfUri;

      await Sharing.shareAsync(shareUri, {
        mimeType: "application/pdf",
        dialogTitle: "Guardar reporte PDF",
      });
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Error al exportar");
    }
  };

  /* ---------------- CARGAR CALENDARIO ---------------- */

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "calendar"), (snap) => {
      const data: CalendarData = {};
      snap.docs.forEach((d) => {
        data[d.id] = d.data() as any;
      });
      setCalendarData(data);
    });

    return () => unsub();
  }, []);

  /* ---------------- SEMANA ACTUAL ---------------- */

  const weekDates = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, []);

  const reportDates = useMemo(() => {
    if (reportType === "week") return weekDates;
    return confirmedDates;
  }, [reportType, confirmedDates, weekDates]);

  /* ---------------- MANEJO DE SUGERENCIAS ---------------- */

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSearchQuery(employee.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleClearEmployee = () => {
    setSelectedEmployee(null);
    setSearchQuery("");
  };

  /* ---------------- UI PRINCIPAL ---------------- */

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Controles superiores - FIJOS (no hacen scroll) */}
      <View style={styles.controlsContainer}>
        <View style={styles.headerRowTop}>
          <Text style={styles.title}>Reportes</Text>

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
        </View>

        {/* BÚSQUEDA DE EMPLEADO */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar empleado por nombre o número..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {selectedEmployee && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearEmployee}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* SUGERENCIAS DE BÚSQUEDA */}
        {showSuggestions && filteredEmployees.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {filteredEmployees.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectEmployee(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.suggestionText}>
                  {item.name} (#{item.number})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* RADIO BUTTONS */}
        {/* BOTONES DE TIPO DE REPORTE - ESTILO TOGGLE */}
        <View style={styles.reportTypeContainer}>
          {[
            { label: "Un día", value: "day" },
            { label: "Rango de fechas", value: "range" },
            { label: "Esta semana", value: "week" },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => {
                setReportType(opt.value as ReportType);
                setRangeStart(null);
                setRangeEnd(null);
                setSelectedDate(null);
                setConfirmedDates([]);
                setShowCalendar(true);
              }}
              style={[
                styles.reportTypeButton,
                reportType === opt.value && styles.reportTypeButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.reportTypeButtonText,
                  reportType === opt.value && styles.reportTypeButtonTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CALENDARIOS */}
        {showCalendar && reportType === "day" && (
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setShowSuggestions(false);
              }}
              markedDates={
                selectedDate
                  ? {
                      [selectedDate]: {
                        selected: true,
                        selectedColor: "#2563eb",
                      },
                    }
                  : {}
              }
              disableAllTouchEventsForDisabledDays={true}
              theme={{
                calendarBackground: "#ffffff",
                textSectionTitleColor: "#334155",
                selectedDayBackgroundColor: "#2563eb",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#2563eb",
                dayTextColor: "#334155",
                textDisabledColor: "#94a3b8",
              }}
            />
            {selectedDate && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  setConfirmedDates([selectedDate]);
                  setShowCalendar(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showCalendar && reportType === "range" && (
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={(day) => {
                if (!rangeStart || (rangeStart && rangeEnd)) {
                  setRangeStart(day.dateString);
                  setRangeEnd(null);
                  setConfirmedDates([]);
                  setShowSuggestions(false);
                  return;
                }

                if (rangeStart && !rangeEnd) {
                  if (day.dateString < rangeStart) {
                    setRangeEnd(rangeStart);
                    setRangeStart(day.dateString);
                  } else {
                    setRangeEnd(day.dateString);
                  }
                }
              }}
              markedDates={{
                ...(rangeStart && {
                  [rangeStart]: {
                    startingDay: true,
                    color: "#2563eb",
                    textColor: "white",
                  },
                }),
                ...(rangeEnd && {
                  [rangeEnd]: {
                    endingDay: true,
                    color: "#2563eb",
                    textColor: "white",
                  },
                }),
                ...(rangeStart &&
                  rangeEnd &&
                  Object.fromEntries(
                    getDatesBetween(rangeStart, rangeEnd).map((date) => [
                      date,
                      {
                        color: "#93c5fd",
                        textColor: "white",
                      },
                    ]),
                  )),
              }}
              markingType="period"
              disableAllTouchEventsForDisabledDays={true}
              theme={{
                calendarBackground: "#ffffff",
                textSectionTitleColor: "#334155",
                selectedDayBackgroundColor: "#2563eb",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#2563eb",
                dayTextColor: "#334155",
                textDisabledColor: "#94a3b8",
              }}
            />
            {rangeStart && rangeEnd && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  setConfirmedDates(getDatesBetween(rangeStart, rangeEnd));
                  setShowCalendar(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* GENERAR REPORTE SEMANAL */}
        {reportType === "week" && (
          <TouchableOpacity
            style={styles.weekButton}
            onPress={() => setConfirmedDates(weekDates)}
            activeOpacity={0.8}
          >
            <Text style={styles.weekButtonText}>Generar reporte</Text>
          </TouchableOpacity>
        )}

        {/* EMPLEADO SELECCIONADO */}
        {selectedEmployee && (
          <View style={styles.selectedEmployeeContainer}>
            <Text style={styles.selectedEmployeeLabel}>
              Empleado seleccionado:
            </Text>
            <View style={styles.selectedEmployeeInfo}>
              <Text style={styles.selectedEmployeeName}>
                {selectedEmployee.name}
              </Text>
              <Text style={styles.selectedEmployeeNumber}>
                #{selectedEmployee.number}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* RESULTADOS - SOLO ESTA PARTE HACE SCROLL */}
      {reportResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            Resultados del reporte
            {selectedEmployee && (
              <Text style={styles.resultsSubtitle}>
                {" "}
                para {selectedEmployee.name}
              </Text>
            )}
          </Text>

          {/* HEADER - con nuevas proporciones */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, { flex: 0.4 }]}>#</Text>
            <Text style={[styles.headerCell, { flex: 1.2 }]}>N°</Text>
            <Text style={[styles.headerCell, { flex: 1.8 }]}>Nombre</Text>
            <Text style={[styles.headerCell, { flex: 1.6 }]}>Fechas</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Días</Text>
          </View>

          {/* FLATLIST - SOLO ESTA PARTE HACE SCROLL */}
          <FlatList
            data={reportResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View style={styles.resultRow}>
                {/* Columna: Índice (siempre centrado, 1 línea) */}
                <View
                  style={[
                    styles.resultCellWrapper,
                    {
                      flex: 0.4,
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Text style={styles.resultCellIndex}>{index + 1}</Text>
                </View>

                {/* Columna: Número (siempre centrado, 1 línea) */}
                <View
                  style={[
                    styles.resultCellWrapper,
                    {
                      flex: 1.2,
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Text style={styles.resultCellNumber}>{item.number}</Text>
                </View>

                {/* Columna: Nombre (puede ocupar varias líneas, alineado arriba) */}
                <View
                  style={[
                    styles.resultCellWrapper,
                    {
                      flex: 1.8,
                      justifyContent: "flex-start",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Text style={styles.resultCellName} numberOfLines={0}>
                    {item.name}
                  </Text>
                </View>

                {/* Columna: Fechas (viñetas, múltiples líneas, alineado arriba) */}
                <View
                  style={[
                    styles.resultCellWrapper,
                    {
                      flex: 1.6,
                      justifyContent: "flex-start",
                      alignItems: "center",
                    },
                  ]}
                >
                  {item.dates.map((date, idx) => (
                    <View key={idx} style={styles.dateItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.dateText}>{formatDate(date)}</Text>
                    </View>
                  ))}
                </View>

                {/* Columna: Días (siempre centrado, 1 línea) */}
                <View
                  style={[
                    styles.resultCellWrapper,
                    { flex: 1, justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  <Text style={styles.resultCellDays}>{item.dates.length}</Text>
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={true}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            updateCellsBatchingPeriod={50}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.flatListContent}
            nestedScrollEnabled={false}
            scrollEnabled={true}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 10 : 0,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 10 : 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  clearButton: {
    padding: 12,
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    marginBottom: 16,
    zIndex: 10,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  suggestionText: {
    fontSize: 16,
    color: "#334155",
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
  calendarContainer: {
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "700",
  },
  weekButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  weekButtonText: {
    color: "white",
    fontWeight: "700",
  },
  selectedEmployeeContainer: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedEmployeeLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  selectedEmployeeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedEmployeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  selectedEmployeeNumber: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 8,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  resultsSubtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    paddingVertical: 10,
    borderRadius: 6,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  headerCell: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 14,
  },
  flatListContent: {
    paddingBottom: Platform.OS === "ios" ? 60 : 40,
  },
  resultRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
    backgroundColor: "#f8f8f0",
    borderRadius: 8,
    marginTop: 6,
    minHeight: 56,
  },
  datesContainer: {
    justifyContent: "center",
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // 👈 NUEVO
    marginBottom: 2,
  },
  bullet: {
    fontSize: 16,
    color: "#64748b",
    marginRight: 4,
    lineHeight: 20,
  },
  dateText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 20,
    textAlign: "center", // 👈 opcional
  },
  resultCellWrapper: {
    paddingVertical: 8,
  },
  resultCellIndex: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  resultCellNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  resultCellName: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
  resultCellDays: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
  },
  headerRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  exportBtn: {
    backgroundColor: "#2f855a",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  exportText: {
    color: "white",
    marginLeft: 6,
    fontWeight: "600",
  },
  reportTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  reportTypeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reportTypeButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  reportTypeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  reportTypeButtonTextActive: {
    color: "white",
  },
});
