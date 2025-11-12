# 🧮 Maqueta Digital Interactiva – Matemática Discreta

![Proyecto](https://img.shields.io/badge/Proyecto-Academico-blueviolet)
![Algoritmos](https://img.shields.io/badge/Algoritmos-Dijkstra%20%7C%20Prim%20(MST)-green)
![Universidad](https://img.shields.io/badge/UVG-Campus_Sur-lightgrey)

Proyecto interactivo que modela **sistemas reales mediante teoría de grafos**, implementando:
- **Dijkstra** – rutas más cortas  
- **Prim / MST** – árbol de expansión mínima  
- **Semáforos** – simulación de flujo y fallos

---

## 🚀 Estructura de la maqueta

```mermaid
graph TD
    A[Teoria de Grafos] --> B[Red de Transporte]
    A --> C[Red Electrica o Agua]
    A --> D[Sistema de Semaforos]

    B --> B1[Dijkstra: Ruta mas corta]
    C --> C1[Prim: Arbol de Expansion Minima]
    D --> D1[Flujo y Fallos]

```
---
```mermaid
flowchart LR
    T1[1. Teoria] --> T2[2. Transporte]
    T2 --> T3[3. Electrica/Agua]
    T3 --> T4[4. Semaforos]
```
*Nota:* Cada módulo permite **editar parámetros**, **visualizar el grafo** y **observar los resultados en tiempo real**.

---

## ⚙️ Componentes principales

| Módulo | Descripción | Algoritmo |
|:-------|:-------------|:-----------|
| Red de transporte 🚍 | Calcula la ruta más corta entre dos puntos del mapa. | Dijkstra |
| Red eléctrica / agua ⚡ | Determina la red óptima de conexiones con menor costo. | Prim (MST) |
| Sistema de semáforos 🚦 | Simula ciclos de tráfico con tiempos configurables. | Grafos de flujo |

---

## 💻 Cómo ejecutar

1. **Clona este repositorio:**
   ```bash
   git clone https://github.com/jeanma0x/proyecto_mate_discreta.git
2. **Abre** el archivo `index.html` en tu navegador o usa **Live Server** (VS Code).  
3. **Explora** las secciones y modifica parámetros para ver los resultados.

---

## 📘 Algoritmos en resumen

- **Dijkstra:** selecciona el nodo más cercano no visitado y actualiza las distancias mínimas.  
- **Prim (MST):** agrega la arista de menor costo que conecta un nodo nuevo sin formar ciclos.  
- **Semáforos:** alterna entre fases N–S y E–O, simulando fallos mediante la desactivación de aristas.

---

## 👨‍💻 Desarrollado por

**Jorge Zamora**, **Gabriel Contreras** y **Jean Marco Portillo**  
📍 *Universidad del Valle de Guatemala – Campus Sur*  
📅 *Curso: Matemática Discreta*

---

## 📜 Licencia

Uso **educativo y libre**.

