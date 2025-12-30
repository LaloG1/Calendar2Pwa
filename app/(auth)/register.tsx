import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      await signUp(email, password);
      router.replace("/login");
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo registrar");
    }
  };

  return (
    <LinearGradient
      colors={["#0A2463", "#1E90FF", "#40E0D0"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.box}>
        <Text style={styles.title}>Crear cuenta</Text>

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
          <Text style={styles.buttonText}>Registrarse</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace("/login")}>
          <Text style={styles.secondaryButtonText}>Volver</Text>
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
});
