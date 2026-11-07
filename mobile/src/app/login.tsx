import React, { useState, useRef, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '@/services/api';
import { useTema } from '@/theme/tema';
import { Colores } from '@/theme/colores';

// El login no usa api(): aquí un 401 significa contraseña incorrecta, no sesión vencida
const ApiURL = `${BASE_URL}/api/auth/login`

// Sigue el modo claro u oscuro elegido en Ajustes (o el del celular)
export default function PantallaInicio(){
  const { colores: c } = useTema()
  const styles = useMemo(() => crearEstilos(c), [c])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null)

  const handleLogin = async () => {
    // VERIFICACION DE DATOS COMPLETOS
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.')
      return
    }
    setError('')
    setLoading(true)

    try{
      let response: Response
      try {
        response = await fetch(ApiURL, {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
      } catch {
        // fetch falla sin respuesta: el servidor está apagado o no hay internet
        throw new Error('No se pudo conectar con Capitalia. Revisa tu conexión e intenta de nuevo.')
      }
      const data = await response.json()

      // SI LOS DATOS SON INCORRECTOS EN EL LOGIN
      if (response.status === 401) {
        throw new Error('El correo o la contraseña no son correctos. Revísalos e intenta de nuevo.')
      }
      if(!response.ok){
        throw new Error(data.message || 'Error en la autenticación')
      }

      // GUARDAMOS LOS DATOS DE INICIO DE SESION
      await SecureStore.setItemAsync('userToken', data.token)
      await SecureStore.setItemAsync('userName', data.nombre)
      await SecureStore.setItemAsync('userId', String(data.id))

      router.replace('/home' as any)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  // DISEÑO DE LA PANTALLA DE INICIO DE SESION
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo: anillo azul con la C de Capitalia */}
          <View style={styles.logo}>
            <View style={styles.logoInterior}>
              <Text style={styles.logoLetra}>C</Text>
            </View>
          </View>

          <Text style={styles.title}>Bienvenido a Capitalia</Text>
          <Text style={styles.subtitulo}>Tus préstamos, claros y al día</Text>

          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={styles.input}
            placeholder="tucorreo@ejemplo.com"
            placeholderTextColor={c.textoTenue}
            value={email}
            onChangeText={(texto) => { setEmail(texto); setError('') }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Text style={styles.label}>Contraseña</Text>
          <View style={[styles.input, styles.inputFila, error !== '' && styles.inputError]}>
            <TextInput
              ref={passwordRef}
              style={styles.inputTexto}
              placeholder="Tu contraseña"
              placeholderTextColor={c.textoTenue}
              value={password}
              onChangeText={(texto) => { setPassword(texto); setError('') }}
              secureTextEntry={!verPassword}
              textContentType="password"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            {/* Ojo para ver lo que se escribió */}
            <TouchableOpacity onPress={() => setVerPassword(!verPassword)} hitSlop={10}>
              <Ionicons name={verPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={c.textoSecundario} />
            </TouchableOpacity>
          </View>

          {error !== '' && (
            <View style={styles.error}>
              <Ionicons name="alert-circle" size={18} color={c.peligro} />
              <Text style={styles.errorTexto}>{error}</Text>
            </View>
          )}

          {/* Empuja el botón hacia abajo de la pantalla */}
          <View style={{ flex: 1, minHeight: 32 }} />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={c.sobrePrimario} />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const crearEstilos = (c: Colores) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.hoja },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 },

  // LOGO
  logo: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: c.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInterior: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.destacada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetra: { fontSize: 28, fontWeight: 'bold', color: c.sobreBanda },

  title: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginTop: 24, color: c.texto },
  subtitulo: { fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 36, color: c.textoSecundario },

  // CAMPOS
  label: { fontSize: 15, color: c.textoSecundario, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: c.borde,
    backgroundColor: c.tarjeta,
    color: c.texto,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  inputFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, marginBottom: 10 },
  inputTexto: { flex: 1, color: c.texto, fontSize: 16, paddingVertical: 16 },
  inputError: { borderColor: c.peligro },

  // ERROR
  error: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  errorTexto: { flex: 1, color: c.peligro, fontSize: 15 },

  // BOTON
  button: {
    backgroundColor: c.primario,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: { color: c.sobrePrimario, fontSize: 17, fontWeight: '600' },
});
