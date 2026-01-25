import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirección si NO hay usuario
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/(auth)/login");
    }
  }, [loading, user]);

  // Pantalla de carga mientras Firebase valida sesión
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ⬇️ Aquí regresan las Tabs
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarIcon: () => "🏠",
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendario",
          tabBarIcon: () => "📅",
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: "Reportes",
          tabBarIcon: () => "📊",
        }}
      />

      <Tabs.Screen
        name="employees"
        options={{
          title: "Empleados",
          tabBarIcon: () => "👥",
        }}
      />
    </Tabs>
  );
}
