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

type Employee = { id: string; number: number; name: string };

export default function CalendarScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [calendarData, setCalendarData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [isException, setIsException] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modal de agregar empleado
  const [modalVisible, setModalVisible] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  // ------------------------------
  // Cargar empleados
  // ------------------------------
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

  // ------------------------------
  // Cargar calendario
  // ------------------------------
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

  // ------------------------------
  // Filtro búsqueda
  // ------------------------------
  const filteredEmployees = useMemo(() => {
    if (!search) return [];

    const s = search.toLowerCase();
    const assignedIds =
      (selectedDate &&
        calendarData[selectedDate]?.employees?.map((e: any) => e.id)) ||
      [];

    return employees.filter(
      (e) =>
        !assignedIds.includes(e.id) && // 👉 excluir asignados
        (String(e.number).includes(s) || e.name.toLowerCase().includes(s))
    );
  }, [search, employees, selectedDate, calendarData]);

  // ------------------------------
  // Marcas en calendario
  // ------------------------------
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

  // ------------------------------
  // Selección de día
  // ------------------------------
  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  // ------------------------------
  // Abrir modal desde botón
  // ------------------------------
  const openAddModal = () => {
    if (!selectedDate) {
      Alert.alert("Selecciona un día", "Debes seleccionar un día primero.");
      return;
    }

    const count = calendarData[selectedDate]?.employees?.length || 0;
    if (count >= 4) {
      Alert.alert("Límite alcanzado", "Este día ya tiene 4 empleados.", [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Agregar excepción",
          style: "default",
          onPress: () => {
            setIsException(true);
            setSearch("");
            setSelectedEmployee(null);
            setExceptionReason("");
            setModalVisible(true);
          },
        },
      ]);
      return;
    }

    setIsException(false);
    setExceptionReason("");
    setSearch("");
    setSelectedEmployee(null);
    setModalVisible(true);
  };

  // ------------------------------
  // Guardar asignación
  // ------------------------------
  const assignEmployee = async () => {
    if (!selectedDate || !selectedEmployee) return;

    const current = calendarData[selectedDate]?.employees || [];

    // 👉 VALIDAR SI YA EXISTE
    const alreadyExists = current.some(
      (e: any) => e.id === selectedEmployee.id
    );

    if (alreadyExists) {
      Alert.alert(
        "Empleado ya asignado",
        `El empleado ${selectedEmployee.name} ya está registrado en este día.`
      );
      return;
    }

    if (isException && exceptionReason.trim().length === 0) {
      Alert.alert(
        "Motivo requerido",
        "Debes ingresar un motivo para la excepción."
      );
      return;
    }

    const ref = doc(db, "calendar", selectedDate);

    try {
      const employeeToSave = {
        ...selectedEmployee,
        exception: isException,
        exceptionReason: isException ? exceptionReason : null,
      };

      await setDoc(ref, {
        employees: [...current, employeeToSave],
      });

      Alert.alert(
        "Asignación exitosa",
        `Empleado ${selectedEmployee.name} agregado al día ${selectedDate}`
      );

      setModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo asignar el empleado.");
    }
  };

  // ------------------------------
  // Eliminar empleado del día
  // ------------------------------
  const removeEmployee = async (empId: string) => {
    if (!selectedDate) return;

    const ref = doc(db, "calendar", selectedDate);
    const current = calendarData[selectedDate]?.employees || [];
    const updated = current.filter((e: any) => e.id !== empId);

    try {
      await updateDoc(ref, { employees: updated });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo eliminar el empleado.");
    }
  };

  // ------------------------------
  // Empleados asignados al día
  // ------------------------------
  const assignedEmployees =
    selectedDate && calendarData[selectedDate]?.employees
      ? calendarData[selectedDate].employees
      : [];

  // ------------------------------
  // Loading
  // ------------------------------
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: 40, paddingHorizontal: 12 }}>
      {/* CALENDARIO */}
      <Calendar markedDates={marked} onDayPress={onDayPress} />

      {/* BOTÓN AGREGAR EMPLEADO */}
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

      {/* TABLA DE EMPLEADOS ASIGNADOS */}
      {selectedDate && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
            Empleados del {selectedDate}
          </Text>

          {assignedEmployees.length === 0 ? (
            <Text style={{ opacity: 0.6 }}>
              No hay empleados asignados aún.
            </Text>
          ) : (
            <>
              {/* HEADER DE TABLA */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#e2e8f0",
                  paddingVertical: 10,
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  alignItems: "center", // centra verticalmente
                }}
              >
                <Text
                  style={{ flex: 1, fontWeight: "700", textAlign: "center" }}
                  numberOfLines={1}
                >
                  #
                </Text>
                <Text
                  style={{ flex: 2, fontWeight: "700", textAlign: "center" }}
                  numberOfLines={1}
                >
                  N° Empleado
                </Text>
                <Text
                  style={{ flex: 2, fontWeight: "700", textAlign: "center" }}
                  numberOfLines={1}
                >
                  Nombre
                </Text>
                <Text
                  style={{ flex: 0.5, fontWeight: "700", textAlign: "center" }}
                  numberOfLines={1}
                >
                  Acc
                </Text>
              </View>

              <FlatList
                data={assignedEmployees}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <View
                    style={{
                      flexDirection: "row",
                      paddingVertical: 10,
                      paddingHorizontal: 6,
                      backgroundColor: "#f8f8f8",
                      borderRadius: 8,
                      marginTop: 6,
                      alignItems: "center",
                      justifyContent: "center", // centra horizontal (colaboración con flex)
                    }}
                  >
                    {/* # */}
                    <Text style={{ flex: 1, textAlign: "center" }}>
                      {index + 1}
                    </Text>

                    {/* Número */}
                    <Text
                      style={{
                        flex: 2,
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      {item.number}
                    </Text>

                    {/* Nombre + Excepción */}
                    <View style={{ flex: 2, alignItems: "center" }}>
                      <Text style={{ textAlign: "center" }}>{item.name}</Text>

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

                    {/* Acciones */}
                    <TouchableOpacity
                      onPress={() => removeEmployee(item.id)}
                      style={{
                        flex: 0.5,
                        alignItems: "center",
                        padding: 6,
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color="#ff3b30"
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
            </>
          )}
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
              Agregar empleado a {selectedDate}
            </Text>

            {/* BUSCADOR */}
            <TextInput
              placeholder="Buscar empleado..."
              style={{
                backgroundColor: "#f2f2f6",
                padding: 10,
                borderRadius: 8,
                marginBottom: 10,
              }}
              value={search}
              onChangeText={setSearch}
            />

            {/* LISTA DE SUGERENCIAS solo cuando se escribe */}
            {search.length > 0 &&
              selectedEmployee === null &&
              filteredEmployees.map((emp) => (
                <TouchableOpacity
                  key={emp.id}
                  onPress={() => {
                    setSelectedEmployee(emp);
                    setSearch(""); // limpiar búsqueda
                  }}
                  style={{
                    padding: 8,
                    borderBottomWidth: 1,
                    borderColor: "#eee",
                  }}
                >
                  <Text>
                    {emp.number} - {emp.name}
                  </Text>
                </TouchableOpacity>
              ))}

            {/* EMPLEADO SELECCIONADO */}
            {selectedEmployee && (
              <View
                style={{
                  backgroundColor: "#eef2ff",
                  padding: 12,
                  borderRadius: 10,
                  marginTop: 12,
                }}
              >
                <Text style={{ fontWeight: "700" }}>Empleado seleccionado</Text>
                <Text>Número: {selectedEmployee.number}</Text>
                <Text>Nombre: {selectedEmployee.name}</Text>
              </View>
            )}

            {selectedEmployee && isException && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: "700", marginBottom: 6 }}>
                  Motivo de la excepción
                </Text>
                <TextInput
                  placeholder="Describe el motivo..."
                  value={exceptionReason}
                  onChangeText={setExceptionReason}
                  multiline
                  style={{
                    backgroundColor: "#f2f2f6",
                    padding: 10,
                    borderRadius: 8,
                    minHeight: 60,
                    textAlignVertical: "top",
                  }}
                />
              </View>
            )}

            {/* BOTONES */}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#2f855a",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
                disabled={!selectedEmployee}
                onPress={assignEmployee}
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
