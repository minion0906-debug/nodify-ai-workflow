# Documentación: Flujos de Trabajo (Workflows)

Los **Flujos de Trabajo** son el núcleo de Nodify. Representan la secuencia de pasos automatizados que diseñas en el lienzo visual para realizar una tarea.

## ¿Qué es un Flujo de Trabajo?

Un flujo de trabajo es una representación visual de un proceso. Comienza con un "disparador" (un evento que inicia el proceso) y continúa a través de una serie de "acciones" y "lógica" que manipulan datos hasta llegar a un resultado final.

**Ejemplos de flujos de trabajo:**
*   Al recibir un pago en Stripe, esperar 5 minutos y luego enviar un correo de bienvenida al cliente.
*   Cada día a las 9 AM, obtener datos de ventas de una base de datos, generar un resumen y enviarlo a un canal de Slack.
*   Cuando un usuario sube un archivo, procesarlo, cambiar su tamaño y guardarlo en un servicio de almacenamiento en la nube.

## La Interfaz del Editor de Workflows

La página de edición de un flujo de trabajo se compone de varias partes:

1.  **El Lienzo (Canvas):** Es el área principal donde arrastras y conectas los nodos. Puedes desplazarte y hacer zoom para organizar flujos de trabajo grandes.
2.  **La Paleta de Nodos:** Accesible a través del botón `(+)` o el menú contextual, es un panel donde puedes buscar y seleccionar los nodos que deseas añadir a tu lienzo.
3.  **El Panel de Propiedades del Nodo:** Al hacer doble clic o una pulsación larga en un nodo, se abre un panel lateral donde puedes configurar su comportamiento específico. Aquí puedes cambiar el nombre del nodo ("Label") y ajustar sus parámetros.
4.  **Controles del Lienzo:** Botones para ejecutar, hacer zoom, y deshacer/rehacer cambios.
5.  **Menú de Acciones:** Un menú en la parte superior para guardar, exportar o compartir tu flujo de trabajo.

## Cómo Funcionan los Flujos de Trabajo

1.  **Inicio (Trigger):** Todo flujo de trabajo activo comienza con un nodo disparador (por ejemplo, `Webhook`, `Cron`). Este nodo no tiene entradas y es el que pone en marcha la automatización cuando ocurre un evento.
2.  **Flujo de Datos:** Los datos fluyen de un nodo a otro a través de las conexiones que dibujas. La salida de un nodo (`output`) se convierte en la entrada (`data`) del siguiente.
3.  **Lógica y Ramificación:** Nodos como `If` o `Switch` te permiten crear diferentes caminos en tu flujo. Dependiendo de una condición, los datos se pueden enrutar por una rama (salida "True") o por otra (salida "False").
4.  **Procesamiento:** Los nodos de acción y datos realizan el trabajo real: llaman a APIs, consultan bases de datos, envían correos electrónicos o ejecutan código personalizado.
5.  **Finalización:** Un flujo de trabajo puede terminar en uno o varios puntos, simplemente cuando un nodo no tiene más conexiones de salida.

## Estado de un Flujo de Trabajo

Un flujo de trabajo puede tener uno de los siguientes estados:

*   **Active (Activo):** El flujo de trabajo está en producción. Sus nodos disparadores están escuchando eventos y se ejecutarán automáticamente.
*   **Inactive (Inactivo):** El flujo de trabajo está deshabilitado temporalmente. No se ejecutará aunque sus condiciones de disparo se cumplan.
*   **Draft (Borrador):** Es un flujo de trabajo en desarrollo. No es funcional y sirve como un espacio para experimentar y construir antes de activarlo.
