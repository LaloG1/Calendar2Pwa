import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";

import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      await signIn(email, password);

      if (rememberEmail) {
        await AsyncStorage.setItem("rememberedEmail", email);
      } else {
        await AsyncStorage.removeItem("rememberedEmail");
      }

      router.replace("/home");
    } catch (e) {
      setError("Credenciales incorrectas");
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  useEffect(() => {
    const loadSavedEmail = async () => {
      const savedEmail = await AsyncStorage.getItem("rememberedEmail");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberEmail(true);
      }
    };

    loadSavedEmail();
  }, []);

  return (
    <LinearGradient
      colors={["#0A2463", "#1E90FF", "#40E0D0"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.box}>
        <Text style={styles.title}>Iniciar sesión</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#6b7280"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={[styles.input, { color: "#111827" }]}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            keyboardType="numeric"
            placeholder="Contraseña"
            placeholderTextColor="#6b7280"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            style={[styles.input, styles.passwordInput, { color: "#111827" }]}
          />

          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#1E90FF"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.rememberContainer}
          onPress={() => setRememberEmail((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={rememberEmail ? "checkbox" : "square-outline"}
            size={22}
            color="#1E90FF"
          />
          <Text style={styles.rememberText}>Recordar correo</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
          <Text style={styles.buttonText}>Ingresar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: "85%",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    padding: 25,
    borderRadius: 16,
    shadowColor: "#0A2463",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    marginBottom: 25,
    textAlign: "center",
    fontWeight: "bold",
    color: "#0A2463",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#1E90FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    shadowColor: "#1E90FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  error: {
    color: "#FF4D4D",
    marginBottom: 15,
    textAlign: "center",
    fontWeight: "500",
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#0A2463",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#1E90FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },
  secondaryButtonText: {
    color: "#1E90FF",
    fontSize: 17,
    fontWeight: "bold",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },

  passwordInput: {
    flex: 1,
    paddingRight: 48, // espacio para el icono
  },

  eyeButton: {
    position: "absolute",
    right: 14,
    padding: 6,
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  rememberText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "500",
  },
});
