# Práctica 3 --- Arquitectura de Microservicios

**Curso:** Software Avanzado\
**Tema:** Análisis de arquitectura y migración a microservicios\
**Autor:** Esdras Jonatan Noj Larios

------------------------------------------------------------------------

## 1) Diagnóstico de la arquitectura actual

### 1.1 Características observables

-   Carga de **CSV** (facturas/gastos/ingresos); validación previa a
    procesamiento.
-   **Flujo de aprobación** en 3 niveles (asistente → supervisor →
    director financiero).
-   **Notificaciones por correo** al finalizar.
-   **Auditoría/logs** y **historial** de archivos/transacciones.
-   Dependencia fuerte de un **bus central/orquestador** en picos
    (cierre de mes).

### 1.2 Conclusión

-   Patrón tipo **SOA con ESB** / *monolito distribuido* alrededor de un
    **bus central**.
-   **Riesgos**: acoplamiento, cuello de botella, *back-pressure*, baja
    elasticidad.

### 1.3 Diagrama --- Arquitectura actual

``` mermaid
flowchart LR
    subgraph Clients[Usuarios]
      U[Usuario Finanzas]
      P[Proveedores]
    end

    U --> BUS
    P --> BUS

    subgraph Core[Bus Central de Servicios]
      BUS[ESB / Bus Central]
    end

    BUS --> AUTH[Servicio de Autenticación]
    BUS --> FACT[Servicio de Facturación]
    BUS --> REP[Servicio de Reportes]
    BUS --> VAL[Validador CSV]
    BUS --> APR[Aprobaciones]
    BUS --> NOTIF[Notificaciones]
    BUS --> LOG[Log/Auditoría]

    VAL --> STG[Almacenamiento CSV]
    REP --> DWH[(BD/Almacén de Reportes)]
```

### Diagrama de Arquitectura Actual
![arquitectura_actual](/P3/img/arquitectura_actual.png)

------------------------------------------------------------------------


## 2) Cuellos de botella

-   **ESB/Bus central** concentra orquestación y tráfico.
-   **Procesamiento batch** de CSV como operación síncrona prolongada.
-   **Dependencias** entre módulos → escalar uno afecta a otros.
-   **Logs** sin segmentación/retención afectan búsquedas.

------------------------------------------------------------------------

## 3) Arquitectura objetivo (Microservicios)

### 3.1 Principios

-   **Dominios bien definidos** por servicio (alta cohesión).\
-   **BD por servicio** (evitar BD compartida).\
-   **API Gateway** para entrada, auth y rate limiting.\
-   **Mensajería** para procesos largos (event-driven), **REST** para
    consultas/acciones.\
-   **Observabilidad**: trazas (OpenTelemetry), métricas (Prometheus),
    logs estructurados.

### 3.2 Diagrama --- Arquitectura propuesta

``` mermaid
flowchart LR
    subgraph Edge[Entrada]
      GW[API Gateway]
    end

    subgraph Async[Broker de Mensajes]
      MQ[(RabbitMQ/Kafka)]
      DLQ[(DLQ)]
    end

    subgraph S1[Auth]
      AUTH[Auth Service] --> DB_AUTH[(BD Auth)]
    end

    subgraph S2[Ingesta]
      ING[Ingest Service] --> DB_ING[(BD Ingesta)]
      ING --- OBJ[(Object Storage: MinIO/S3)]
    end

    subgraph S3[Validación]
      VAL[Validation Service] --> DB_VAL[(BD Reglas/Historial)]
    end

    subgraph S4[Aprobaciones]
      APR[Approval Service] --> DB_APR[(BD Workflow)]
    end

    subgraph S5[Finanzas]
      FIN[Finance Service] --> DB_FIN[(BD Finanzas)]
    end

    subgraph S6[Notificaciones]
      NOTIF[Notification Service] --> DB_NOTIF[(BD Notif)]
    end

    subgraph S7[Auditoría]
      AUD[Audit/Log Service] --> DB_AUD[(Event Store/Logs)]
    end

    subgraph S8[Reportes]
      REP[Reporting/BI Service] --> DWH[(Data Mart/OLAP)]
    end

    Clients[Clientes/UI] --> GW
    GW --> AUTH
    GW --> ING
    GW --> APR
    GW --> FIN
    GW --> REP

    ING -- "FileUploaded" --> MQ
    MQ --> VAL
    VAL -- "ValidationCompleted" --> MQ
    MQ --> APR
    APR -- "FinalApproved" --> MQ
    MQ --> FIN
    FIN -- "PaymentExecuted" --> MQ
    MQ --> NOTIF
    MQ --> AUD
    AUD -.-> REP
```

### 3.3 Razones del diseño

-   **Escalabilidad**: ING/VAL/APR escalan sin impactar Auth/Notif.
-   **Resiliencia**: reintentos + **DLQ**; **idempotencia** por
    `requestId`.
-   **Evolución**: despliegue independiente; **versionado** de
    contratos.

### Diagrama de Arquitectura Propuesta
![arquitectura_propuesta](/P3/img/arquitectura_microservicios.png)

------------------------------------------------------------------------

## 4) Modelos de datos (BD por servicio)

![ingesta_service](/P3/img/entidad_relacion.png)

## 5) Flujos clave (secuencias)

### 5.1 Carga y validación de CSV

![Secuencia_Usuario_Finanzas](/P3/img/secuencia_user_finanzas.png)

### 5.2 Aprobación en 3 niveles

![Tres_Niveles](/P3/img/secuencia_3_niveles.png)

### 5.3 Notificación y auditoría

![Notificacion_Auditoria](/P3/img/notificacion_auditoria.png)

------------------------------------------------------------------------
