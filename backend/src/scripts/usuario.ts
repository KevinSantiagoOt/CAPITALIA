// CAMBIAR LA CONTRASEÑA DE UN USUARIO O CREAR UNO NUEVO, DESDE LA TERMINAL
// Uso (en la carpeta backend):  npm run usuario
// Pide el correo: si ya existe, cambia su contraseña; si no, crea el usuario.
// La contraseña se escribe aquí mismo y no se ve en pantalla.
import readline from 'readline'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

// Pregunta normal
const preguntar = (texto: string) => new Promise<string>((resolve) => rl.question(texto, resolve))

// Pregunta sin mostrar lo que se escribe (para la contraseña)
const preguntarOculto = (texto: string) =>
  new Promise<string>((resolve) => {
    const salida = rl as unknown as { _writeToOutput: (s: string) => void }
    const original = salida._writeToOutput
    process.stdout.write(texto)
    salida._writeToOutput = () => {} // no repite las teclas en pantalla
    rl.question('', (respuesta) => {
      salida._writeToOutput = original
      process.stdout.write('\n')
      resolve(respuesta)
    })
  })

const pedirPassword = async () => {
  while (true) {
    const password = await preguntarOculto('Contraseña nueva (mínimo 6 caracteres): ')
    if (password.length < 6) {
      console.log('Muy corta, intenta de nuevo.')
      continue
    }
    const repetida = await preguntarOculto('Repítela: ')
    if (password !== repetida) {
      console.log('No coinciden, intenta de nuevo.')
      continue
    }
    return bcrypt.hash(password, 10) // igual que el registro y el cambio de contraseña de la app
  }
}

const main = async () => {
  // Los correos se guardan en minúsculas (el login también los normaliza)
  const email = (await preguntar('Correo: ')).trim().toLowerCase()
  if (!email) throw new Error('Falta el correo')

  const existente = await prisma.usuario.findUnique({ where: { email } })

  if (existente) {
    console.log(`Usuario encontrado: ${existente.nombre}. Vas a cambiar su contraseña.`)
    const hash = await pedirPassword()
    await prisma.usuario.update({ where: { id: existente.id }, data: { password: hash } })
    console.log('Listo: contraseña actualizada.')
  } else {
    console.log('No hay ningún usuario con ese correo. Vamos a crearlo.')
    const nombre = (await preguntar('Nombre: ')).trim()
    if (!nombre) throw new Error('Falta el nombre')
    const hash = await pedirPassword()
    await prisma.usuario.create({ data: { nombre, email, password: hash } })
    console.log(`Listo: usuario ${nombre} creado.`)
  }
}

main()
  .catch((error) => console.log('Error:', error instanceof Error ? error.message : error))
  .finally(async () => {
    rl.close()
    await prisma.$disconnect()
  })
