import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { db } from "../../src/firebase/firebase";

type Employee = {
  id: string;
  number: number;
  name: string;
  exception?: boolean;
  exceptionReason?: string | null;
};

type AssignMode = "single" | "multiple";

export default function CalendarScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [calendarData, setCalendarData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [isException, setIsException] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  /* 🔽 NUEVO */
  const [assignMode, setAssignMode] = useState<AssignMode>("single");
  const [multiDates, setMultiDates] = useState<string[]>([]);
  const [showMultiCalendar, setShowMultiCalendar] = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  /* ---------------- CARGAR EMPLEADOS ---------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "employees"), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Employee[];

      setEmployees(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ---------------- CARGAR CALENDARIO ---------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "calendar"), (snap) => {
      const data: Record<string, any> = {};
      snap.docs.forEach((d) => {
        data[d.id] = d.data();
      });
      setCalendarData(data);
    });

    return () => unsub();
  }, []);

  /* ---------------- FILTRO ---------------- */
  const filteredEmployees = useMemo(() => {
    if (!search) return [];

    const assignedIds =
      (selectedDate &&
        calendarData[selectedDate]?.employees?.map((e: any) => e.id)) ||
      [];

    return employees.filter(
      (e) =>
        !assignedIds.includes(e.id) &&
        (String(e.number).includes(search) ||
          e.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, employees, selectedDate, calendarData]);

  /* ---------------- MARCAS CALENDARIO ---------------- */
  const marked = useMemo(() => {
    const m: any = {};

    Object.keys(calendarData).forEach((date) => {
      const count = calendarData[date]?.employees?.length || 0;
      m[date] = {
        marked: true,
        dotColor: count < 4 ? "green" : "red",
      };
    });

    if (selectedDate) {
      m[selectedDate] = {
        ...(m[selectedDate] || {}),
        selected: true,
        selectedColor: "#4e73df",
      };
    }

    return m;
  }, [calendarData, selectedDate]);

  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  /* ---------------- ABRIR MODAL ---------------- */
  const openAddModal = () => {
    if (!selectedDate) {
      Alert.alert("Selecciona un día primero");
      return;
    }

    const count = calendarData[selectedDate]?.employees?.length || 0;

    const open = (exception: boolean) => {
      setIsException(exception);
      setExceptionReason("");
      setAssignMode("single");
      setMultiDates([]);
      setShowMultiCalendar(false);
      setSearch("");
      setSelectedEmployee(null);
      setModalVisible(true);
    };

    if (count >= 4) {
      Alert.alert("Límite alcanzado", "Este día ya tiene 4 empleados.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Agregar excepción", onPress: () => open(true) },
      ]);
      return;
    }

    open(false);
  };

  /* ---------------- GUARDAR ---------------- */
  const assignEmployee = async () => {
    if (!selectedEmployee) return;

    const dates =
      assignMode === "single"
        ? selectedDate
          ? [selectedDate]
          : []
        : multiDates;

    if (dates.length === 0) {
      Alert.alert("Selecciona al menos un día");
      return;
    }

    if (isException && exceptionReason.trim() === "") {
      Alert.alert("Motivo requerido");
      return;
    }

    try {
      for (const date of dates) {
        const ref = doc(db, "calendar", date);
        const current = calendarData[date]?.employees || [];

        if (current.some((e: any) => e.id === selectedEmployee.id)) continue;

        const employeeToSave = {
          ...selectedEmployee,
          exception: isException,
          exceptionReason: isException ? exceptionReason : null,
        };

        await setDoc(ref, { employees: [...current, employeeToSave] });
      }

      Alert.alert("Asignación exitosa");
      setModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error");
    }
  };

  /* ---------------- ELIMINAR ---------------- */
  const removeEmployee = async (empId: string) => {
    if (!selectedDate) return;
    const ref = doc(db, "calendar", selectedDate);
    const current = calendarData[selectedDate]?.employees || [];
    await updateDoc(ref, {
      employees: current.filter((e: any) => e.id !== empId),
    });
  };

  const assignedEmployees =
    selectedDate && calendarData[selectedDate]?.employees
      ? calendarData[selectedDate].employees
      : [];
  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: 40, paddingHorizontal: 12 }}>
      {/* CALENDARIO PRINCIPAL */}
      <Calendar markedDates={marked} onDayPress={onDayPress} />

      {/* BOTÓN AGREGAR */}
      <TouchableOpacity
        style={{
          backgroundColor: "#2f855a",
          padding: 12,
          borderRadius: 8,
          marginTop: 16,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={openAddModal}
      >
        <Ionicons name="add-circle-outline" size={20} color="white" />
        <Text style={{ color: "white", marginLeft: 6, fontWeight: "700" }}>
          Agregar empleado
        </Text>
      </TouchableOpacity>

      {/* TABLA */}
      {selectedDate && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
            Empleados del {selectedDate}
          </Text>

          <View style={{ maxHeight: 260 }}>
            <FlatList
              data={assignedEmployees}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.exception) {
                      Alert.alert(
                        "Motivo de la excepción",
                        item.exceptionReason || "Sin motivo registrado"
                      );
                    }
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      paddingVertical: 10,
                      paddingHorizontal: 6,
                      backgroundColor: "#f8f8f8",
                      borderRadius: 8,
                      marginTop: 6,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ flex: 0.5, textAlign: "center" }}>
                      {index + 1}
                    </Text>

                    <Text
                      style={{
                        flex: 2,
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      {item.number}
                    </Text>

                    <View style={{ flex: 2, alignItems: "center" }}>
                      <Text>{item.name}</Text>
                      {item.exception && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#d97706",
                            marginTop: 2,
                          }}
                        >
                          ⚠ Excepción
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        removeEmployee(item.id);
                      }}
                      style={{ flex: 0.5, alignItems: "center" }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color="#ff3b30"
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      )}

      {/* ---------------- MODAL ---------------- */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              width: "90%",
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
              Agregar empleado
            </Text>

            {/* BUSCAR */}
            <TextInput
              placeholder="Buscar empleado..."
              value={search}
              onChangeText={setSearch}
              style={{
                backgroundColor: "#f2f2f6",
                padding: 10,
                borderRadius: 8,
                marginBottom: 10,
              }}
            />

            {search.length > 0 &&
              !selectedEmployee &&
              filteredEmployees.map((emp) => (
                <TouchableOpacity
                  key={emp.id}
                  onPress={() => {
                    setSelectedEmployee(emp);
                    setSearch("");
                  }}
                >
                  <Text style={{ padding: 6 }}>
                    {emp.number} - {emp.name}
                  </Text>
                </TouchableOpacity>
              ))}

            {/* SELECCIONADO */}
            {selectedEmployee && (
              <>
                <View
                  style={{
                    backgroundColor: "#eef2ff",
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 10,
                  }}
                >
                  <Text>Número: {selectedEmployee.number}</Text>
                  <Text>Nombre: {selectedEmployee.name}</Text>
                </View>

                {/* RADIO BUTTONS */}
                <View style={{ marginTop: 12 }}>
                  <TouchableOpacity onPress={() => setAssignMode("single")}>
                    <Text>{assignMode === "single" ? "🔘" : "⚪"} 1 día</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setAssignMode("multiple");
                      setShowMultiCalendar(true);
                    }}
                  >
                    <Text>
                      {assignMode === "multiple" ? "🔘" : "⚪"} Más de 1 día
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* CALENDARIO MULTI */}
                {assignMode === "multiple" && showMultiCalendar && (
                  <>
                    <Calendar
                      onDayPress={(day) => {
                        setMultiDates((prev) =>
                          prev.includes(day.dateString)
                            ? prev.filter((d) => d !== day.dateString)
                            : [...prev, day.dateString]
                        );
                      }}
                      markedDates={multiDates.reduce((acc: any, d) => {
                        acc[d] = {
                          selected: true,
                          selectedColor: "#4e73df",
                        };
                        return acc;
                      }, {})}
                    />

                    <TouchableOpacity
                      onPress={() => setShowMultiCalendar(false)}
                      style={{
                        backgroundColor: "#2f855a",
                        padding: 8,
                        borderRadius: 6,
                        marginTop: 8,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "white" }}>OK</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* DÍAS SELECCIONADOS */}
                {assignMode === "multiple" && multiDates.length > 0 && (
                  <Text style={{ marginTop: 8 }}>
                    Días: {multiDates.join(", ")}
                  </Text>
                )}

                {/* EXCEPCIÓN */}
                {isException && (
                  <TextInput
                    placeholder="Motivo de excepción"
                    value={exceptionReason}
                    onChangeText={setExceptionReason}
                    multiline
                    style={{
                      backgroundColor: "#f2f2f6",
                      padding: 10,
                      borderRadius: 8,
                      marginTop: 10,
                    }}
                  />
                )}
              </>
            )}

            {/* BOTONES */}
            <View style={{ flexDirection: "row", marginTop: 20 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#2f855a",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
                onPress={assignEmployee}
                disabled={!selectedEmployee}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  Aceptar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#e2e8f0",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  marginLeft: 10,
                }}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ fontWeight: "700" }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
