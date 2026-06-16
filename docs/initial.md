# Specification: Iktia TSX-to-Web-Component Compiler

## 1. Zielbild

Das Projekt soll ermöglichen, Web Components mit einer modernen, React-ähnlichen Developer Experience zu schreiben, ohne zur Laufzeit React, Solid, Lit, Stencil oder ein vergleichbares Framework auszuliefern.

Entwickler schreiben kleine Komponenten in TypeScript/TSX mit Props, lokalem State, Events und einer Render-Funktion. Ein Vite-Plugin transformiert diese Komponenten vor dem regulären Build in native Custom Elements.

Das Ziel ist nicht, React-kompatibel zu sein. Das Ziel ist ein bewusst kleines, statisch analysierbares Komponentenmodell, aus dem der Compiler effiziente DOM-Erzeugung und DOM-Updates generieren kann.

## 2. Motivation

Native Web Components sind als Distributionsformat attraktiv, weil sie in Plain HTML, React, Angular, Vue, CMS-Seiten und klassischen Webseiten genutzt werden können.

Das native Programmiermodell von Custom Elements ist jedoch unattraktiv für Teams, die aus React/TypeScript kommen. Manuelle DOM-Erzeugung, Lifecycle-Callbacks, Attribut-Synchronisierung, Style-Injection und Update-Logik führen schnell zu viel Boilerplate und Fehleranfälligkeit.

Gesucht wird daher ein Layer, der nicht zur Laufzeit abstrahiert, sondern zur Build-Zeit übersetzt:

```txt
TSX Component Source
  → Vite Transform
  → Native Custom Element Class
  → Browser executes Iktia Web Component
```

Das Authoring-Modell soll deklarativ sein. Die generierte Komponente darf intern imperative DOM-Mutationen enthalten.

## 3. Nicht-Ziele

Das Projekt soll ausdrücklich kein vollständiger React-Ersatz sein.

Nicht unterstützt werden im ersten Schritt:

* React-Kompatibilität
* React Hooks API als exakte Kopie
* Context
* Portals
* Suspense
* Error Boundaries
* Server Components
* komplexe Effects
* beliebige Children-as-functions
* virtuelle DOM-Diffing-Runtime
* Cross-Compilation nach React, Vue, Svelte oder andere Frameworks

Das Projekt soll auch kein Cross-Compiler wie Mitosis sein. Es hat genau ein Ziel: native Custom Elements.

## 4. Grundprinzip

Die Komponenten-API muss klein genug sein, damit der Compiler sie zuverlässig statisch analysieren kann.

Eine Komponente besteht aus:

* einem Custom-Element-Namen
* typisierten Props
* optionalem lokalem State
* einer TSX-Render-Funktion
* optionalen Event-Emittern
* optionalen Styles
* optionaler Shadow-DOM-Konfiguration

Beispiel:

```tsx
import { component, prop, state, event } from "@iktia/core";
import * as styles from "./counter.css";

export default component("x-counter", () => {
  const label = prop<string>("label", "Count");
  const count = state(0);

  const change = event<number>("change");

  return (
    <button
      class={styles.button}
      onClick={() => {
        count.set(count() + 1);
        change.emit(count());
      }}
    >
      {label()}: {count()}
    </button>
  );
});
```

Der Compiler erzeugt daraus eine Custom-Element-Klasse:

```ts
class XCounter extends HTMLElement {
  // generated prop handling
  // generated state handling
  // generated DOM creation
  // generated DOM updates
  // generated event dispatching
}

customElements.define("x-counter", XCounter);
```

## 5. Authoring API

### 5.1 `component()`

Definiert eine Web Component.

```tsx
export default component("x-button", () => {
  return <button><slot /></button>;
});
```

Optional:

```tsx
export default component(
  "x-button",
  {
    shadow: true,
    styles: [buttonStyles],
  },
  () => {
    return <button><slot /></button>;
  }
);
```

### 5.2 `prop()`

Definiert eine öffentliche Property und optional ein reflektiertes Attribut.

```tsx
const variant = prop<"primary" | "secondary">("variant", "primary");
const disabled = prop.boolean("disabled", false);
const count = prop.number("count", 0);
```

Props können über Attribute oder Properties gesetzt werden.

```html
<x-button variant="primary" disabled></x-button>
```

Oder:

```ts
button.variant = "secondary";
button.disabled = true;
```

Der Compiler generiert:

* Property Getter/Setter
* optional `observedAttributes`
* Attribut-zu-Property-Konvertierung
* Update-Trigger bei Änderungen

### 5.3 `state()`

Definiert lokalen, internen State.

```tsx
const open = state(false);

<button onClick={() => open.set(!open())}>
  Toggle
</button>
```

State ist nicht öffentlich. State-Änderungen triggern gezielte DOM-Updates.

Initial bewusst keine komplexe Proxy-Magie. State ist explizit lesbar und setzbar:

```tsx
open()
open.set(true)
open.update(value => !value)
```

### 5.4 `event()`

Definiert typisierte Custom Events.

```tsx
const valueChange = event<string>("value-change");

<input
  onInput={(event) => {
    valueChange.emit(event.currentTarget.value);
  }}
/>
```

Generierter Output:

```ts
this.dispatchEvent(
  new CustomEvent("value-change", {
    detail: value,
    bubbles: true,
    composed: true,
  })
);
```

Konfiguration:

```tsx
const valueChange = event<string>("value-change", {
  bubbles: true,
  composed: true,
  cancelable: false,
});
```

## 6. Render-Modell

Das Render-Modell basiert auf TSX, aber nicht auf React.

TSX ist nur Syntax für eine statisch analysierbare Template-Beschreibung.

Unterstützt im MVP:

```tsx
<div />
<button disabled={disabled()} />
<span>{label()}</span>
<slot />
<slot name="icon" />
```

Unterstützte Event-Bindings:

```tsx
<button onClick={() => count.set(count() + 1)} />
<input onInput={(event) => value.set(event.currentTarget.value)} />
```

Unterstützte Bedingungen:

```tsx
{open() && <div>Content</div>}
```

Oder explizit:

```tsx
<Show when={open()}>
  <div>Content</div>
</Show>
```

Unterstützte Listen im späteren Schritt:

```tsx
<For each={items()}>
  {(item) => <div>{item.label}</div>}
</For>
```

Für den MVP können Listen zunächst ausgeschlossen werden, weil sie deutlich mehr Update-Logik benötigen.

## 7. Compiler-Strategie

Der Compiler analysiert die TSX-Datei und erzeugt optimierten imperative DOM-Code.

Beispiel-Input:

```tsx
return (
  <button onClick={() => count.set(count() + 1)}>
    Count: {count()}
  </button>
);
```

Konzeptueller Output:

```ts
const button = document.createElement("button");
const text = document.createTextNode(`Count: ${this.#count}`);

button.append(text);

button.addEventListener("click", () => {
  this.#count += 1;
  text.data = `Count: ${this.#count}`;
});
```

Kein Virtual DOM. Kein Runtime-Diffing. Stattdessen generiert der Compiler direkte Update-Punkte für dynamische Bindings.

## 8. Update-Modell

Jede dynamische Expression im Template wird einem Update-Slot zugeordnet.

Beispiel:

```tsx
<button disabled={disabled()}>
  {label()}
</button>
```

Compiler erzeugt ungefähr:

```ts
updateDisabled() {
  button.disabled = this.#disabled;
}

updateLabel() {
  text.data = this.#label;
}
```

Bei einer Prop- oder State-Änderung ruft der generierte Code nur die betroffenen Update-Funktionen auf.

Im ersten Schritt darf ein einfacherer Modus erlaubt sein:

```ts
this.#update();
```

Dieser Modus aktualisiert alle dynamischen Bindings, baut aber nicht den gesamten DOM neu auf.

Später kann der Compiler Abhängigkeiten genauer tracken.

## 9. Styling

Das Styling soll TypeScript-validiert und build-time-basiert sein.

Primäre Zielrichtung:

```ts
// button.css.ts
import { style } from "@vanilla-extract/css";

export const button = style({
  borderRadius: 8,
  padding: "0.5rem 1rem",
});
```

```tsx
import * as styles from "./button.css";

return <button class={styles.button}>Save</button>;
```

Damit bleibt erhalten:

* TypeScript-validierte Klassennamen
* statisches CSS
* keine CSS-in-JS-Runtime
* gute Tooling-Integration
* Tree-Shaking- und Build-Kompatibilität

## 10. Styling mit Shadow DOM

Bei Shadow DOM müssen Styles in den Shadow Root gelangen.

Drei Strategien sollen unterstützt werden:

### 10.1 Light DOM Mode

```tsx
component("x-button", { shadow: false }, () => ...)
```

Die Komponente rendert in den Light DOM. Vanilla-Extract-CSS wird normal global geladen. Das ist am einfachsten, aber weniger stark gekapselt.

### 10.2 Shadow DOM mit inline CSS

Der Build lädt erzeugtes CSS als String und injiziert es in den Shadow Root.

```ts
const style = document.createElement("style");
style.textContent = cssText;
shadowRoot.append(style);
```

### 10.3 Shadow DOM mit Constructable Stylesheets

Für moderne Browser kann der Compiler `adoptedStyleSheets` nutzen.

```ts
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);
shadowRoot.adoptedStyleSheets = [sheet];
```

Konfiguration:

```ts
wc({
  styles: "adoptedStyleSheets",
});
```

Fallback:

```ts
wc({
  styles: {
    mode: "adoptedStyleSheets",
    fallback: "style-tag",
  },
});
```

## 11. Design Tokens und externe Anpassbarkeit

Für Design-Systeme sollen CSS Custom Properties der primäre Weg für Theming sein.

```css
:host {
  --x-button-bg: var(--color-primary);
  --x-button-fg: white;
}

.button {
  background: var(--x-button-bg);
  color: var(--x-button-fg);
}
```

Für gezielte externe Anpassbarkeit kann `part` genutzt werden:

```tsx
<button part="button" class={styles.button}>
  <slot />
</button>
```

Consumer:

```css
x-button::part(button) {
  font-weight: 600;
}
```

Interne Struktur soll nicht zufällig öffentlich sein. Externe Styling-API muss explizit über CSS Custom Properties und Parts definiert werden.

## 12. Slots

Slots müssen früh unterstützt werden, weil sie für Web Components zentral sind.

```tsx
<button>
  <slot />
</button>
```

Named Slots:

```tsx
<span class={styles.icon}>
  <slot name="icon" />
</span>
<span>
  <slot />
</span>
```

Consumer:

```html
<x-button>
  <x-icon slot="icon"></x-icon>
  Save
</x-button>
```

Slots werden nicht wie React `children` behandelt. Sie sind echte Web-Component-Slots.

## 13. Attribute und Properties

Das Modell muss sauber zwischen Attributen und Properties unterscheiden.

Attribute sind string-basiert:

```html
<x-counter count="3"></x-counter>
```

Properties können komplexe Werte tragen:

```ts
counter.items = [{ label: "A" }, { label: "B" }];
```

MVP-Unterstützung:

* string
* number
* boolean
* enum-like string unions

Später:

* arrays
* objects
* custom parser/serializer

Beispiel:

```tsx
const count = prop.number("count", 0);
const disabled = prop.boolean("disabled", false);
const variant = prop<"primary" | "secondary">("variant", "primary");
```

## 14. Lifecycle

Das Authoring-Modell soll Lifecycle möglichst vermeiden.

MVP:

```tsx
onConnected(() => {
  // optional
});

onDisconnected(() => {
  // cleanup
});
```

Kein allgemeines `useEffect` im MVP. Effects öffnen schnell die Tür zu einem vollständigen Runtime-Modell.

Falls nötig, sollten Lifecycle-Hooks explizit und eng bleiben.

## 15. Vite-Integration

Das Projekt wird primär als Vite-Plugin entwickelt.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { iktia } from "@iktia/vite";

export default defineConfig({
  plugins: [
    iktia({
      include: /\.wc\.tsx$/,
      shadow: true,
      styles: "adoptedStyleSheets",
    }),
  ],
});
```

Dateikonvention:

```txt
src/components/button/button.wc.tsx
src/components/button/button.css.ts
```

Der Plugin-Transform greift vor dem normalen TSX-Handling.

Input:

```txt
button.wc.tsx
```

Output:

```txt
button.wc.js
```

Die ausgegebene Datei ist ein normales ESM-Modul, das ein Custom Element definiert oder eine Registrierung exportiert.

## 16. Registrierung

Zwei Modi:

### 16.1 Auto-Define

```tsx
export default component("x-button", () => ...);
```

Erzeugt:

```ts
customElements.define("x-button", XButton);
```

### 16.2 Manual Define

```tsx
export const Button = component("x-button", { define: false }, () => ...);
```

Consumer:

```ts
import { defineXButton } from "./button.wc";

defineXButton();
```

Das ist wichtig für Tree-Shaking und kontrollierte Registrierung in Bibliotheken.

## 17. TypeScript-Ziele

Das Tool soll TypeScript als zentrales Qualitätsmerkmal nutzen.

Gewünscht:

* typisierte Props
* typisierte Events
* validierte Style-Imports
* typisierte Element-Instanzen
* optional globale JSX/HTMLElement-Erweiterung

Beispiel:

```ts
declare global {
  interface HTMLElementTagNameMap {
    "x-button": XButtonElement;
  }
}
```

Für React-Consumer kann später optional ein Typ-Adapter generiert werden, aber nicht als MVP-Ziel.

## 18. Output-Ziele

Der erzeugte Code soll:

* native Custom Elements verwenden
* keine React-/Solid-/Lit-/Stencil-Runtime benötigen
* möglichst kleine Helper verwenden
* pro Komponente tree-shakable sein
* ESM-first sein
* moderne Browser als primäres Ziel haben
* optional Fallbacks für ältere Browser unterstützen

Ein kleiner Shared Helper ist akzeptabel, solange er nicht zum Framework wird.

Beispiel akzeptabel:

```ts
import { attrToBool, scheduleMicrotask } from "@iktia/runtime";
```

Nicht akzeptabel:

```ts
import { render, createVNode, diff } from "@iktia/runtime";
```

## 19. MVP-Scope

Der erste Prototyp soll nur wenige Features unterstützen:

* `component()`
* `prop.string`
* `prop.boolean`
* `prop.number`
* `state()`
* statische DOM-Struktur
* Text-Bindings
* Attribut-/Property-Bindings
* Event Listener
* Shadow DOM
* Slots
* Vanilla-Extract-kompatible Class-Imports
* CSS-Injection in Shadow DOM
* Custom Event Emit

Explizit noch nicht im MVP:

* Listen
* keyed updates
* komplexe Bedingungsbäume
* Effects
* Context
* Form-associated Custom Elements
* SSR
* Hydration
* Cross-Framework-Wrapper

## 20. Beispielkomponente: Button

```tsx
import { component, prop, event } from "@iktia/core";
import * as styles from "./button.css";

export default component("x-button", { shadow: true }, () => {
  const variant = prop<"primary" | "secondary">("variant", "primary");
  const disabled = prop.boolean("disabled", false);
  const press = event<void>("press");

  return (
    <button
      part="button"
      class={styles.button}
      data-variant={variant()}
      disabled={disabled()}
      onClick={() => {
        if (!disabled()) {
          press.emit();
        }
      }}
    >
      <slot />
    </button>
  );
});
```

Verwendung:

```html
<x-button variant="primary">Save</x-button>
```

```ts
button.addEventListener("press", () => {
  console.log("pressed");
});
```

## 21. Beispielkomponente: Text Field

```tsx
import { component, prop, state, event } from "@iktia/core";
import * as styles from "./text-field.css";

export default component("x-text-field", { shadow: true }, () => {
  const label = prop.string("label", "");
  const value = prop.string("value", "");
  const error = prop.string("error", "");
  const focused = state(false);

  const valueChange = event<string>("value-change");

  return (
    <label class={styles.root} data-focused={focused()}>
      <span class={styles.label}>{label()}</span>

      <input
        part="input"
        class={styles.input}
        value={value()}
        onFocus={() => focused.set(true)}
        onBlur={() => focused.set(false)}
        onInput={(event) => {
          const nextValue = event.currentTarget.value;
          value.set(nextValue);
          valueChange.emit(nextValue);
        }}
      />

      {error() && (
        <span part="error" class={styles.error}>
          {error()}
        </span>
      )}
    </label>
  );
});
```

Dieses Beispiel ist bewusst anspruchsvoller, weil es zentrale Anforderungen bündelt:

* Props
* State
* Events
* Styling
* bedingtes Rendering
* Shadow DOM
* Parts
* externe Nutzbarkeit

## 22. Technische Architektur

Das Projekt besteht aus drei Teilen.

### 22.1 Authoring Package

```txt
Iktia
```

Exportiert die Authoring-API:

```ts
component
prop
state
event
onConnected
onDisconnected
```

Diese API ist primär für TypeScript und Compiler-Erkennung da. Im Idealfall wird sie größtenteils weggecompiled.

### 22.2 Vite Plugin

```txt
@iktia/vite
```

Verantwortlich für:

* Datei-Erkennung
* TSX-Parsing
* AST-Analyse
* Validierung erlaubter Patterns
* Code-Generierung
* Style-Handling
* Source Maps
* Fehlermeldungen

### 22.3 Tiny Runtime

```txt
@iktia/runtime
```

Nur kleine, stabile Helper:

* Attribute parsing
* Event creation
* Microtask scheduling
* Style adoption fallback
* Guard für doppelte Registrierung

Keine Render-Runtime. Kein Virtual DOM.

## 23. Fehlermodell

Der Compiler soll bewusst streng sein.

Nicht statisch analysierbarer Code soll mit klarer Fehlermeldung abbrechen.

Beispiel nicht erlaubt:

```tsx
const Tag = condition ? "button" : "a";
return <Tag />;
```

Fehlermeldung:

```txt
Dynamic component tags are not supported in Iktia.
Use explicit conditional branches instead.
```

Nicht erlaubt im MVP:

```tsx
return items.map(item => <div>{item.label}</div>);
```

Stattdessen später:

```tsx
<For each={items()}>
  {(item) => <div>{item.label}</div>}
</For>
```

Das Ziel ist Vorhersagbarkeit statt maximaler JavaScript-Flexibilität.

## 24. Bewertungskriterien

Der Prototyp ist erfolgreich, wenn:

* ein Button und ein Text Field geschrieben werden können
* der Output ohne React/Solid/Lit/Stencils Runtime läuft
* Shadow DOM funktioniert
* Styling type-safe über importierte Klassen funktioniert
* CSS im Shadow Root verfügbar ist
* Props und Attribute synchronisiert werden
* Events nach außen sauber funktionieren
* die generierte Bundle-Größe nachvollziehbar klein bleibt
* Plain HTML, React und Angular die Komponenten konsumieren können
* der generierte Code lesbar genug ist, um Debugging zu erlauben

## 25. Strategische Positionierung

Das Projekt positioniert sich zwischen Stencil, Atomico und Mitosis.

Im Vergleich zu Stencil:

* funktionales Authoring statt Decorator-/Klassenmodell
* stärker auf Vite/TSX zugeschnitten
* kleinerer Zielumfang
* weniger Framework-Gefühl

Im Vergleich zu Atomico:

* weniger Runtime
* stärker compiler-orientiert
* weniger Hooks-/Framework-Modell

Im Vergleich zu Mitosis:

* kein Cross-Compiler
* nur ein Target: native Custom Elements
* dafür bessere Kontrolle über Output, Styling und Web-Component-Spezifika

Kurzform:

```txt
A Vite-native TSX compiler for native Web Components.
React-like authoring, native Custom Element output, no framework runtime.
```
