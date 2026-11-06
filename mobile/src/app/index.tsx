import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync("userToken").then((token) => {
      if (token) {
        router.replace("/home");
      } else {
        router.replace("/login");
      }
      setChecking(false);
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {checking && <ActivityIndicator size="large" />}
    </View>
  );
}