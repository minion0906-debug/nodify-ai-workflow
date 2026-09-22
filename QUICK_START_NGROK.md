# 🚀 Quick Start: Ngrok con Nodify

## Pasos Rápidos

### 1. Tu servidor ya está corriendo en el puerto 9003

```bash
# Ya está ejecutándose:
npm run dev
```

### 2. En una NUEVA terminal, inicia ngrok

```bash
npm run ngrok
```

o también puedes usar:

```bash
npm run tunnel
```

### 3. ¡Listo! 🎉

Verás algo como esto:

```
Session Status                online
Account                       tu-cuenta (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:9003

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### 4. Usa tu URL pública

Tu Nodify ahora es accesible en: `https://abc123.ngrok-free.app`

## Casos de Uso Comunes

### Probar Webhooks

```
https://abc123.ngrok-free.app/api/webhook/tu-webhook-id
```

### Compartir Formularios

```
https://abc123.ngrok-free.app/api/form/prod/tu-form-id
```

### Ver desde tu teléfono

Abre `https://abc123.ngrok-free.app` en el navegador de tu móvil.

## Panel de Control

Abre `http://localhost:4040` para ver:
- Todas las peticiones en tiempo real
- Detalles de request/response
- Poder reenviar peticiones

## Mejorar tu Experiencia (Opcional)

### 1. Obtén un Token de Autenticación

Visita: [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)

### 2. Configura el Token

```bash
ngrok config add-authtoken TU_TOKEN_AQUI
```

**Beneficios:**
- ✅ Sesiones más largas (8 horas en lugar de 2)
- ✅ Más conexiones por minuto
- ✅ URL personalizadas (planes de pago)

## Notas Importantes

⚠️ **URL Temporal**: La URL cambia cada vez que reinicias ngrok (a menos que tengas plan de pago).

⚠️ **Página de Advertencia**: Los usuarios verán una página de advertencia de ngrok antes de acceder (normal en plan gratuito).

⚠️ **No Compartir con Desconocidos**: Tu servidor local estará expuesto a internet.

## Detener ngrok

Presiona `Ctrl+C` en la terminal donde está corriendo ngrok.

## ¿Problemas?

### "ngrok not found"

Reinstala:
```bash
npm install -g ngrok
```

### "Connection refused"

Asegúrate de que tu servidor esté corriendo:
```bash
npm run dev
```

### Puerto ocupado

Verifica qué está usando el puerto 9003:
```bash
netstat -ano | findstr :9003
```

## Documentación Completa

Para más detalles, consulta: `NGROK_SETUP.md`
