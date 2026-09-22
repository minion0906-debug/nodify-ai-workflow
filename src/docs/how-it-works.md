
# ¿Cómo Funciona Nodify? (Arquitectura)

Nodify está construido sobre una pila de tecnologías modernas y robustas, diseñada para ser extensible, eficiente y fácil de mantener. A continuación se detalla la arquitectura principal de la aplicación.

## 1. Frontend

La interfaz de usuario que ves y con la que interactúas está construida con las siguientes tecnologías:

*   **Next.js y React:** Un framework de React que proporciona renderizado del lado del servidor, generación de sitios estáticos y una excelente experiencia de desarrollo para construir una aplicación web rápida y escalable.
*   **TypeScript:** Añade un sistema de tipos estáticos a JavaScript, lo que mejora la calidad del código, reduce los errores en tiempo de ejecución y mejora la autocompletación en el editor.
*   **Tailwind CSS y ShadCN/UI:** Utilizamos Tailwind CSS para un diseño basado en utilidades que permite una personalización rápida y coherente. Sobre esta base, los componentes de la interfaz de usuario de alta calidad provienen de la biblioteca ShadCN/UI.
*   **React Flow:** Es la biblioteca principal que impulsa el editor de flujos de trabajo. Se encarga de renderizar los nodos y las conexiones, gestionar el estado del lienzo y manejar las interacciones del usuario como arrastrar, soltar y conectar.

## 2. Backend y Almacenamiento de Datos

La persistencia de los datos (tus flujos de trabajo, credenciales, etc.) se gestiona a través de los servicios de Firebase:

*   **Firebase Authentication:** Gestiona la autenticación de usuarios de forma segura, permitiendo el inicio de sesión y el registro. Cada conjunto de datos en la aplicación está vinculado a un ID de usuario único.
*   **Firestore:** Es la base de datos NoSQL donde se almacena toda la información de la aplicación. La estructura está organizada por usuario, garantizando que cada usuario solo pueda acceder a sus propios datos (flujos de trabajo, tablas, credenciales).

## 3. Motor de Flujos de Trabajo y Ejecución

La "magia" de la ejecución de los flujos de trabajo se basa en la definición de cada nodo:

*   **Definición de Nodos (JSON):** Cada nodo, ya sea preconstruido o personalizado en "Node Labs", se define mediante un archivo JSON. Este archivo especifica sus propiedades, puertos de entrada/salida, apariencia y, lo más importante, su lógica de ejecución.
*   **`executionCode`:** La propiedad `executionCode` en la definición de un nodo contiene un fragmento de código JavaScript. Cuando un flujo de trabajo se ejecuta, un motor interpreta este código para cada nodo en secuencia.
*   **Contexto de Ejecución:** El código dentro de `executionCode` tiene acceso a un objeto de contexto (`context`) que contiene los datos del nodo anterior (`context.data`), las propiedades del nodo actual (`context.node.properties`), y el historial de ejecución (`execution`). Esto permite que la lógica sea dinámica y reactiva. Para más detalles, consulta la [Documentación de Nodos](./nodes-documentation.md).

## 4. Funcionalidades de IA

Para las características impulsadas por inteligencia artificial, como la generación automática de descripciones de nodos:

*   **Genkit (de Firebase):** Utilizamos Genkit, un framework de código abierto para construir aplicaciones de IA. Nos permite definir flujos de IA (`flows`) que pueden llamar a modelos de lenguaje (como Gemini de Google) de una manera estructurada y segura desde el servidor.

Esta arquitectura modular permite que Nodify sea a la vez potente para los usuarios finales y extensible para los desarrolladores que deseen añadir nuevas funcionalidades o nodos personalizados.
