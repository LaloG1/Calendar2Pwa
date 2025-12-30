import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
export default function HomeScreen() {
  const { signOut } = useAuth();
  const router = useRouter();

  // Animaciones
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <Image
        source={require("../../assets/images/1212.png")}
        style={styles.avatar}
      />

      {/* Bienvenida */}
      <Text style={styles.title}>¡Bienvenido!</Text>

      {/* Botones de Dashboard */}
      {/* Primera fila: Calendario / Reportes */}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.cardBtn}
          onPress={() => router.push("/calendar")}
        >
          <Text style={styles.cardText}>Calendario</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardBtn}
          onPress={() => router.push("/reports")}
        >
          <Text style={styles.cardText}>Reportes</Text>
        </TouchableOpacity>
      </View>

      {/* Segunda fila: Empleados */}
      <View style={styles.rowCenter}>
        <TouchableOpacity
          style={styles.cardBtnSingle}
          onPress={() => router.push("/employees")}
        >
          <Text style={styles.cardText}>Empleados</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      {/* Footer fijo abajo */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Ionicons name="warning-outline" size={20} color="white" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 100,
    marginBottom: 20,
    borderColor: "#fff",
    borderWidth: 3,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
  },

  dashboard: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 40,
  },

  cardBtn: {
    backgroundColor: "#4e73df",
    paddingVertical: 20,
    borderRadius: 15,
    width: "48%",
    alignItems: "center",
  },

  cardText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },

  logoutBtn: {
    backgroundColor: "#ff3b30", // rojo tipo iOS (danger)
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 14,
    width: "80%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    // sombra elegante
    shadowColor: "#ff0000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5, // Android
  },
  logoutText: {
    color: "white",
    fontWeight: "600",
    fontSize: 17,
    marginLeft: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },

  rowCenter: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
  },

  cardBtnSingle: {
    backgroundColor: "#4e73df",
    paddingVertical: 20,
    borderRadius: 15,
    width: "70%", // más grande en el centro
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    alignItems: "center",
  },
});
