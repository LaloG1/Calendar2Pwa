import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
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
  const EMPTY_SELECTED_COLOR = "#38bdf8"; // azul cielo

  // Dentro de CalendarScreen()
  const [assignmentType, setAssignmentType] = useState<
    "vacaciones" | "permiso" | "falta" | null
  >(null);
  const [showTypeModal, setShowTypeModal] = useState(false); // Modal de selección de tipo

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
    null,
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
          e.name.toLowerCase().includes(search.toLowerCase())),
    );
  }, [search, employees, selectedDate, calendarData]);

  const today = new Date().toISOString().split("T")[0];

  /* ---------------- MARCAS CALENDARIO ---------------- */
  const marked = useMemo(() => {
    const m: any = {};

    Object.keys(calendarData).forEach((date) => {
      const count = calendarData[date]?.employees?.length || 0;

      m[date] = {
        customStyles: {
          container: {
            alignItems: "center",
          },
          text: {
            fontWeight: "600",
          },
        },
        lineColor: count < 4 ? "#16a34a" : "#dc2626", // 👈 PROPIEDAD CUSTOM
      };
    });

    if (selectedDate) {
      m[selectedDate] = {
        ...(m[selectedDate] || {}),
      };
    }

    return m;
  }, [calendarData, selectedDate]);

  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  //Nueva función para manejar la selección de tipo:
  const handleSelectType = (type: "vacaciones" | "permiso" | "falta") => {
    setShowTypeModal(false);
    setAssignmentType(type);

    const count = calendarData[selectedDate!]?.employees?.length || 0;

    if (type === "vacaciones") {
      if (count < 4) {
        // Hay disponibilidad → asignación normal
        openEmployeeSelectionModal(false, type);
      } else {
        // No hay disponibilidad → excepción
        if (Platform.OS === "web") {
          const confirmed = window.confirm(
            "Este día ya tiene 4 empleados.\n¿Deseas agregar una excepción de vacaciones?",
          );
          if (confirmed) {
            openEmployeeSelectionModal(true, type);
          }
        } else {
          Alert.alert("Límite alcanzado", "Este día ya tiene 4 empleados.", [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Agregar excepción",
              onPress: () => openEmployeeSelectionModal(true, type),
            },
          ]);
        }
      }
    } else {
      // Permiso o falta: siempre permitido, sin excepción
      openEmployeeSelectionModal(false, type);
    }
  };

  const openEmployeeSelectionModal = (
    exception: boolean,
    type: "vacaciones" | "permiso" | "falta",
  ) => {
    setIsException(exception);
    setExceptionReason("");
    setAssignMode("single");
    setMultiDates([]);
    setShowMultiCalendar(false);
    setSearch("");
    setSelectedEmployee(null);
    setAssignmentType(type);
    setModalVisible(true);
  };

  /* ---------------- ABRIR MODAL ---------------- */
  const openAddModal = () => {
    if (!selectedDate) {
      if (Platform.OS === "web") {
        window.alert("Selecciona un día primero");
      } else {
        Alert.alert("Selecciona un día primero");
      }
      return;
    }

    // Mostrar modal para elegir tipo
    setShowTypeModal(true);
  };

  /* ---------------- GUARDAR ---------------- */
  const assignEmployee = async () => {
    if (!selectedEmployee || !assignmentType) return;

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
          tipo: assignmentType, // 👈 ¡Nuevo campo!
        };

        await setDoc(ref, { employees: [...current, employeeToSave] });
      }

      Alert.alert("Asignación exitosa");
      setModalVisible(false);
      setAssignmentType(null);
    } catch (err) {
      console.error(err);
      Alert.alert("Error");
    }
  };

  /* ---------------- ELIMINAR ---------------- */
  const confirmRemoveEmployee = (emp: Employee) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `¿Deseas quitar a ${emp.name} del día ${selectedDate}?`,
      );
      if (confirmed) {
        removeEmployee(emp.id);
      }
    } else {
      Alert.alert(
        "Eliminar empleado",
        `¿Deseas quitar a ${emp.name} del día ${selectedDate}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => removeEmployee(emp.id),
          },
        ],
      );
    }
  };

  const removeEmployee = async (empId: string) => {
    if (!selectedDate) return;

    const ref = doc(db, "calendar", selectedDate);
    const current = calendarData[selectedDate]?.employees || [];

    const updated = current.filter((e: any) => e.id !== empId);

    if (updated.length === 0) {
      // 🔥 eliminar el día completo
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { employees: updated });
    }
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
      <Calendar
        markedDates={marked}
        markingType="custom"
        dayComponent={({ date, state, marking }) => {
          const customMarking = marking as any;

          const isSelected = selectedDate === date?.dateString;
          const isToday = today === date?.dateString;

          const hasLine = !!customMarking?.lineColor;

          // 🎨 color del círculo
          let circleColor = "transparent";

          if (isSelected && !isToday) {
            if (hasLine) {
              circleColor = customMarking.lineColor; // verde o rojo
            } else {
              circleColor = "#38bdf8"; // 🔵 azul cielo (sin registros)
            }
          }

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={state === "disabled"}
              onPress={() => {
                if (date?.dateString) {
                  onDayPress({ dateString: date.dateString });
                }
              }}
            >
              <View style={{ alignItems: "center" }}>
                {/* CÍRCULO */}
                <View
                  style={{
                    backgroundColor: circleColor,
                    borderRadius: 20,
                    padding: 6,
                    minWidth: 32,
                    alignItems: "center",
                  }}
                >
                  {/* NÚMERO */}
                  <Text
                    style={{
                      color: isToday
                        ? "#2563eb" // 🔵 hoy siempre azul
                        : state === "disabled"
                          ? "#d1d5db"
                          : isSelected
                            ? "white"
                            : "#111827",
                      fontWeight: isToday || isSelected ? "700" : "500",
                    }}
                  >
                    {date?.day}
                  </Text>
                </View>

                {/* LÍNEA */}
                {hasLine && (
                  <View
                    style={{
                      width: 18,
                      height: 3,
                      borderRadius: 2,
                      marginTop: 4,
                      backgroundColor: customMarking.lineColor,
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        onDayPress={onDayPress}
      />

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
                        item.exceptionReason || "Sin motivo registrado",
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
                        confirmRemoveEmployee(item);
                      }}
                      style={{
                        flex: 0.5,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#ff3b30",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                        minWidth: 40,
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "600",
                          fontSize: 12,
                        }}
                      >
                        Elim
                      </Text>
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
              placeholderTextColor="#6b7280" // 👈 gris visible
              value={search}
              onChangeText={setSearch}
              style={{
                backgroundColor: "#f2f2f6",
                padding: 10,
                borderRadius: 8,
                marginBottom: 10,
                color: "#111827", // 👈 texto negro
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
                            : [...prev, day.dateString],
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
                    placeholderTextColor="#6b7280"
                    value={exceptionReason}
                    onChangeText={setExceptionReason}
                    multiline
                    style={{
                      backgroundColor: "#f2f2f6",
                      padding: 10,
                      borderRadius: 8,
                      marginTop: 10,
                      color: "#111827",
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

      {/* Modal de selección de tipo */}
      <Modal visible={showTypeModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 12,
              width: "80%",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Selecciona el tipo
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: "#dbeafe",
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
                alignItems: "center",
              }}
              onPress={() => handleSelectType("vacaciones")}
            >
              <Text style={{ color: "#1d4ed8", fontWeight: "600" }}>
                Vacaciones
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#dcfce7",
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
                alignItems: "center",
              }}
              onPress={() => handleSelectType("permiso")}
            >
              <Text style={{ color: "#16a34a", fontWeight: "600" }}>
                Permiso
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#fee2e2",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
              }}
              onPress={() => handleSelectType("falta")}
            >
              <Text style={{ color: "#dc2626", fontWeight: "600" }}>Falta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                marginTop: 16,
                padding: 8,
                alignItems: "center",
              }}
              onPress={() => setShowTypeModal(false)}
            >
              <Text style={{ color: "#6b7280" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
