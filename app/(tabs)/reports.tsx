import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { db } from "../../src/firebase/firebase";

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

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rangeDates, setRangeDates] = useState<string[]>([]);
  const [confirmedDates, setConfirmedDates] = useState<string[]>([]);

  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

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

    // ordenar fechas (más reciente → más antigua)
    return Object.values(map).map((e) => ({
      ...e,
      dates: e.dates.sort((a, b) => (a < b ? 1 : -1)),
    }));
  }, [confirmedDates, calendarData]);

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

  /* ---------------- FECHAS CONFIRMADAS ---------------- */

  const reportDates = useMemo(() => {
    if (reportType === "week") return weekDates;
    return confirmedDates;
  }, [reportType, confirmedDates, weekDates]);

  /* ---------------- EMPLEADOS ---------------- */

  const reportEmployees = useMemo(() => {
    return reportDates.flatMap((date) =>
      calendarData[date]?.employees
        ? calendarData[date].employees.map((e) => ({
            ...e,
            date,
          }))
        : []
    );
  }, [reportDates, calendarData]);

  /* ---------------- UI ---------------- */

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* ---------- TÍTULO ---------- */}
      <Text style={{ fontSize: 24, fontWeight: "800", marginBottom: 20 }}>
        Reportes
      </Text>

      {/* ---------- RADIO BUTTONS ---------- */}
      {[
        { label: "Un día", value: "day" },
        { label: "Rango de fechas", value: "range" },
        { label: "Esta semana", value: "week" },
      ].map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => {
            setReportType(opt.value as ReportType);

            // 🔄 limpiar selecciones anteriores
            setRangeStart(null);
            setRangeEnd(null);
            setSelectedDate(null);
            setConfirmedDates([]);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons
            name={
              reportType === opt.value ? "radio-button-on" : "radio-button-off"
            }
            size={22}
            color="#2563eb"
          />
          <Text style={{ marginLeft: 8, fontSize: 16 }}>{opt.label}</Text>
        </TouchableOpacity>
      ))}

      {/* ---------- DATE PICKERS ---------- */}
      {reportType === "day" && (
        <>
          <Calendar
            onDayPress={(day) => setSelectedDate(day.dateString)}
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
          />

          <TouchableOpacity
            style={{
              backgroundColor: "#2563eb",
              padding: 10,
              borderRadius: 8,
              marginTop: 10,
              alignItems: "center",
            }}
            onPress={() => selectedDate && setConfirmedDates([selectedDate])}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>OK</Text>
          </TouchableOpacity>
        </>
      )}

      {reportType === "range" && (
        <>
          <Calendar
            markingType="period"
            onDayPress={(day) => {
              // 1️⃣ No hay inicio o ya había rango → reiniciar
              if (!rangeStart || (rangeStart && rangeEnd)) {
                setRangeStart(day.dateString);
                setRangeEnd(null);
                setConfirmedDates([]);
                return;
              }

              // 2️⃣ Hay inicio pero no fin
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
                  ])
                )),
            }}
          />

          {rangeStart && rangeEnd && (
            <TouchableOpacity
              style={{
                backgroundColor: "#2563eb",
                padding: 10,
                borderRadius: 8,
                marginTop: 10,
                alignItems: "center",
              }}
              onPress={() =>
                setConfirmedDates(getDatesBetween(rangeStart, rangeEnd))
              }
            >
              <Text style={{ color: "white", fontWeight: "700" }}>OK</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ---------- GENERAR REPORTE ---------- */}
      {reportType === "week" && (
        <TouchableOpacity
          style={{
            backgroundColor: "#2563eb",
            padding: 12,
            borderRadius: 8,
            marginVertical: 16,
            alignItems: "center",
          }}
          onPress={() => setConfirmedDates(weekDates)}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            Generar reporte
          </Text>
        </TouchableOpacity>
      )}

      {/* ---------- RESULTADOS ---------- */}
      {reportResults.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
            Resultados del reporte
          </Text>

          {/* HEADER */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#e2e8f0",
              paddingVertical: 10,
              borderRadius: 6,
              paddingHorizontal: 6,
            }}
          >
            <Text style={{ flex: 0.5, textAlign: "center", fontWeight: "700" }}>
              #
            </Text>
            <Text style={{ flex: 1.5, textAlign: "center", fontWeight: "700" }}>
              N°
            </Text>
            <Text style={{ flex: 2, textAlign: "center", fontWeight: "700" }}>
              Nombre
            </Text>
            <Text style={{ flex: 3, textAlign: "center", fontWeight: "700" }}>
              Fechas
            </Text>
          </View>

          {/* BODY */}
          {reportResults.map((item, index) => (
            <View
              key={item.id}
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
                style={{ flex: 1.5, textAlign: "center", fontWeight: "600" }}
              >
                {item.number}
              </Text>

              <Text style={{ flex: 2, textAlign: "center" }}>{item.name}</Text>

              <Text style={{ flex: 3, textAlign: "center", fontSize: 12 }}>
                {item.dates.join(", ")}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
