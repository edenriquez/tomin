# Tomin: Tu brújula financiera 🧭

**Tomin** es una herramienta de análisis financiero potenciada por IA para usuarios mexicanos. Permite recuperar el control de tus finanzas sin abrumarte, utilizando una interfaz minimalista y clara.

## 🏗️ Estructura del Proyecto

El repositorio es un monorepo que contiene tres proyectos principales:

- `backend/`: API en Python con Clean Architecture (Entidades, Casos de Uso y DTOs listos).
- `frontend/`: Aplicación en Next.js (Dashboard, Pronósticos y Landing Page listos).
- `infrastructure/`: Configuración de Terraform para despliegue en la nube.

### Flujos Implementados 🚀

1.  **Dashboard Moderno**: Visualización de balance, gastos y distribución de categorías.
2.  **Motor de Pronósticos**: Simulador interactivo "What-if" para proyectar el patrimonio.
3.  **Insights de IA**: Sugerencias personalizadas para optimizar el capital.
4.  **Clean Backend**: Arquitectura modular lista para conectar con Supabase/OpenAI.

```text
.
├── backend/                # Lógica de negocio y API (Python)
│   ├── src/
│   │   ├── application/    # Casos de uso y DTOs
│   │   ├── domain/         # Entidades y contratos de repositorios
│   │   └── infrastructure/ # Implementaciones técnicas (DB, APIs externas)
│   ├── tests/              # Pruebas unitarias e integración
│   └── pyproject.toml
├── frontend/               # Interfaz de usuario (Next.js)
│   ├── src/
│   │   ├── app/            # Rutas y páginas
│   │   ├── components/     # UI y Gráficos
│   │   ├── hooks/          # Hooks personalizados
│   │   └── services/       # Comunicación con el Backend
│   └── package.json
└── infrastructure/         # Despliegue (Terraform)
    └── terraform/
        ├── modules/        # Módulos reutilizables
        └── main.tf         # Configuración principal
```

## 🧠 Decisiones Arquitectónicas

1.  **Backend: Clean Architecture**: Separación estricta entre la lógica de negocio (Dominio) y los detalles técnicos (Infraestructura). Esto permite probar casos de uso sin depender de una base de datos real.
2.  **Frontend: Progressive Disclosure**: La interfaz muestra lo más importante primero (Gastos totales, balance) y permite profundizar en detalles (transacciones específicas, proyecciones) solo cuando el usuario lo desea.
3.  **Infraestructura: Serverless First**: Uso de tecnologías que escalan a cero y ofrecen niveles gratuitos generosos (Vercel, AWS Lambda/Google Cloud Run, Supabase).

## 🚀 Próximos Pasos

1.  **Dominio Backend**: Definir los modelos de datos en `backend/src/domain/entities/`.
2.  **Dashboard Frontend**: Implementar la visualización principal basada en los mocks.
3.  **Motor de Pronósticos**: Desarrollar la lógica para detectar transacciones recurrentes y generar proyecciones.
