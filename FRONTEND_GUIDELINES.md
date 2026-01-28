# Development Guidelines & Architecture Standards

Diese Richtlinien sind **zwingend** für jeglichen generierten Code im Projekt `drone-project` einzuhalten, insbesondere für das Frontend (`web_ui`).

---

## 1. 🎨 Frontend Styling (Next.js & Tailwind & Shadcn)

Wir verwenden für **alle** UI-Elemente die installierten `shadcn/ui` Komponenten. Native HTML-Elemente sind zu vermeiden.

Alles klar — ich ziehe die Zügel **minimal** an, ohne es unnötig dogmatisch zu machen:

---

## 1. Komponenten-Richtlinien

### 1.1 Component Mapping (verbindlicher Default - Shadcn)

**Grundsatz:**
Normales HTML ist **grundsätzlich erlaubt**, soll jedoch **nicht für UI-relevante oder interaktive Komponenten** verwendet werden.
Für **größere, wiederverwendbare oder visuell relevante Komponenten** ist **Shadcn UI der verbindliche Default**.
Abweichungen sind nur zulässig, wenn Shadcn die Anforderung **nicht sinnvoll abbildet** oder es sich um **rein strukturelles Markup** handelt.

| Anwendungsfall   | ❌ Native HTML (nicht erlaubt für UI-Komponenten) | ✅ Verbindlicher Shadcn-Ersatz                                  |
| :--------------- | :----------------------------------------------- | :------------------------------------------------------------- |
| Container / Card | `<div className="border ..." />`                 | `<Card>`, `<CardContent>`, `<CardHeader>`                      |
| Button / Action  | `<button>`                                       | `<Button>` (`variant="default"`, `"destructive"`, `"outline"`) |
| Eingabefeld      | `<input>`                                        | `<Input>`                                                      |
| Status / Label   | `<span className="bg-red-500 ..." />`            | `<Badge>`                                                      |
| Ladeindikator    | `<div className="w-full ..." />`                 | `<Progress>`                                                   |
| Toggle           | `<input type="checkbox">`                        | `<Switch>` oder `<Checkbox>`                                   |
| Dropdown         | `<select>`                                       | `<Select>`, `<SelectContent>`, `<SelectItem>`                  |
| Trennlinie       | `<hr>`                                           | `<Separator>`                                                  |
| Slider           | `<input type="range">`                           | `<Slider>`                                                     |

**Erlaubte HTML-Ausnahmen:**

* Layout-Wrapper (`div`, `section`, `main`) **ohne visuelle UI-Logik**
* Text-Semantik (`p`, `span`, `strong`, `em`)
* Wenn die Komponente **keine Wiederverwendung** und **keinen Design-Impact** hat

---

#### Import-Konvention (verpflichtend)

Shadcn-Komponenten müssen direkt aus `src/components/ui` importiert werden:

```tsx
import { Button } from "@/components/ui/button"; // ✅ korrekt
```



### 1.2 Shadow & Depth System
Wir verwenden **ausschließlich** das folgende Depth-System für Schatten. Standard Tailwind-Schatten (`shadow-md`, `shadow-lg`) sind **verboten**.

Die Schatten sind in der `globals.css` als CSS-Variablen definiert:
*   `--shadow-0`: Keine Tiefe (Flat - Hintergründe).
*   `--shadow-1`: Leichte Tiefe (Cards, Buttons).
*   `--shadow-2`: Mittlere Tiefe (Dropdowns, Popover).
*   `--shadow-3`: Hohe Tiefe (Modals, Floating Action Buttons).

**Verwendung im Code:**
Nutze Tailwind Arbitrary Values oder Utility Classes (falls konfiguriert):
```tsx
// Richtig:
<div className="shadow-[var(--shadow-1)] bg-card ...">
```

### 1.3 Color System
*   **Verbot:** Keine direkten Tailwind-Farben (`bg-blue-500`, `text-red-600`) und keine Hex-Codes (`#ff0000`).
*   **Gebot:** Nutze primär die **semantischen Shadcn-Farben**:
    *   `bg-background`, `bg-card`, `bg-primary`, `bg-destructive`, `bg-muted`.
    *   `text-foreground`, `text-primary-foreground`, `text-muted-foreground`.
*   **Neue Farben:** Wenn eine Farbe benötigt wird, die nicht durch Shadcn abgedeckt ist (z.B. spezifische Drohnen-Status-Farben), muss sie in der `globals.css` im dafür vorgesehenen Block definiert werden.

**Definiere neue Farben immer in diesem Block in `src/app/globals.css`:**
```css
/* --- AGENT CUSTOM COLORS START --- */
:root {
  --drone-battery-high: 142 76% 36%; /* HSL */
  --drone-battery-low: 0 84% 60%;
}
/* --- AGENT CUSTOM COLORS END --- */
```

### 1.4 Spacing & Typography Hierarchie
Wir nutzen das strikte 4px Grid System von Tailwind.
*   **Container Padding:** `p-4` (16px) oder `p-6` (24px) für Cards/Panels.
*   **Gap:** `gap-2` (8px) für enge Elemente, `gap-4` (16px) für Layouts.

**Typografie:**
*   **Headlines (H1/H2):** `font-bold tracking-tight`.
*   **Labels/Subheaders:** `text-sm font-medium text-muted-foreground`.
*   **Data Values:** `font-mono` für numerische Telemetrie-Daten.

---

## 2. 📂 Project Structure & TypeScript

### 2.1 Type Management
Types und Interfaces dürfen **NICHT** in der Komponenten-Datei definiert werden.
Sie müssen zentralisiert im `src/types` Ordner liegen.

**Struktur:**
```text
src/types/
├── drone.ts        # Telemetrie, Status, Mode Enums
├── ros.ts          # ROS Message Interfaces
└── components.ts   # Komplexe Props für UI Komponenten
```

**Beispiel:**
```typescript
// src/types/drone.ts
export interface DroneState {
    altitude: number;
    battery: number;
    isArmed: boolean;
}

// src/components/TelemetryCard.tsx
import { DroneState } from "@/types/drone";
// ...
```

### 2.2 Component Architecture
*   **Pflicht:** Nutze `lucide-react` für alle Icons.
*   **Pflicht:** Nutze `shadcn/ui` Komponenten als Basis (`Card`, `Button`, `Badge`). Baue nichts from scratch, was Shadcn bietet.
*   **Struktur:** Komponenten müssen klein und funktional getrennt sein.
    *   `src/components/drone/` -> Drohnen-spezifische UI.
    *   `src/components/layout/` -> Header, Sidebar, Grid.

---

## 3. 🐍 Backend (Python / ROS 2)

*   **Typing:** Nutze Type Hints für alle Funktionsparameter und Rückgabewerte.
*   **ROS 2:**
    *   Erbe immer von `rclpy.node.Node`.
    *   Keine Blocking Calls im Main Thread (nutze Async/Await Clients oder Callbacks).
    *   Logging: Nutze `self.get_logger().info()`, kein `print()`.

---

## 4. 🤖 Agent Workflow Instructions

Wenn du Code generierst:
1.  Prüfe zuerst, ob ein passender Type in `src/types` existiert oder erstelle ihn dort.
2.  Prüfe, ob eine passende Shadcn-Komponente existiert.
3.  Wende das Shadow-System (`var(--shadow-x)`) auf alle Container/Cards an.
4.  Stelle sicher, dass keine "Magic Colors" verwendet werden.

**Beispiel für eine korrekte Komponente:**
```tsx
import { Battery } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DroneTelemetry } from "@/types/drone";

export function BatteryStatus({ level }: { level: number }) {
  // Logic to determine color variable based on level
  const statusColor = level < 20 ? "text-destructive" : "text-primary";

  return (
    <Card className="shadow-[var(--shadow-1)] border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Battery Level
        </CardTitle>
        <Battery className={`h-4 w-4 ${statusColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">{level}%</div>
      </CardContent>
    </Card>
  );
}
```