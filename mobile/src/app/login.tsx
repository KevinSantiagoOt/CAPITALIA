import {useState} from 'react';
import * as SecureStore from 'expo-secure-store';
import {router} from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';

const ApiURL = "http://192.168.100.25:3000/api/auth/login"

export default function PantallaInicio(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    // VERIFICACION DE DATOS COMPLETOS
    if (!email || !password) {
      Alert.alert('Error', 'Campos incompletos');
      return;
    }
    setLoading(true)

    try{
      const response = await fetch(ApiURL, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json()

      // SI LOS DATOS SON INCORRECTOS EN EL LOGIN
      if(!response.ok){
        throw new Error(data.message || 'Error en la autenticación')
      }

      // GUARDAMOS LOS DATOS DE INICIO DE SESION
        await SecureStore.setItemAsync('userToken', data.token)
        await SecureStore.setItemAsync('userName', data.nombre)
        await SecureStore.setItemAsync('userId', String(data.id))

        router.replace('/home' as any)

      console.log('Login exitoso:', data);
      Alert.alert('Bienvenido', `Hola, ${data.nombre}!`)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrio un error inesperado';
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  // DISEÑO DE LA PANTALLA DE INICIO DE SESION
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capitalia</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Ingresar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});