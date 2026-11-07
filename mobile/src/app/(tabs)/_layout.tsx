import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="prestamos"
        options={{
          title: "Préstamos",
          tabBarIcon: ({ color, size }) => <Ionicons name="cash" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="deudores"
        options={{
          title: "Deudores",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}