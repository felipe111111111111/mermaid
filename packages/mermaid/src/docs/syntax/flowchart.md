graph TD
    A([Inicio]) --> B[/Ingresar datos: 
    tarifa básica, edad, temporada,
    tipo de pasajero, compañía/]
    B --> C{Compañía es ALAS?}
    C -->|Sí| D{Temporada alta?}
    C -->|No| E{Temporada alta?}
    D -->|Sí| F[Incrementar tarifa 30%]
    D -->|No| G[Mantener tarifa]
    E -->|Sí| H[Incrementar tarifa 20%]
    E -->|No| I[Mantener tarifa]
    F --> J{Edad < 18?}
    G --> K{Estudiante y mayor de edad?}
    H --> J
    I --> J
    K -->|Sí| L[Aplicar descuento 10%]
    K -->|No| M[No aplicar descuento adicional]
    L --> J
    M --> J
    J -->|Sí| N[Aplicar descuento 50%]
    J -->|No| O[No aplicar descuento por edad]
    N --> P[Calcular precio final]
    O --> P
    P --> Q[/Imprimir nombre del
    pasajero y precio final/]
    Q --> R([Fin])
