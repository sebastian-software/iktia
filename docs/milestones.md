# Iktia TSX-to-Web-Component Compiler: Meilenstein-Plan

Stand: 2026-06-16

Dieses Dokument zerlegt die Spezifikation aus `docs/initial.md` in umsetzbare
Meilensteine. Ziel ist ein Rust/OXC-basierter Compiler mit Vite-Plugin, der
statisch analysierbaren TSX-Code mit React- und Solid-inspirierter Authoring-DX
in native Web Components kompiliert. Jeder Meilenstein endet mit mindestens
einem Commit im Conventional-Commits-Format.

## Projektziel und Architekturprinzipien

Der Compiler erzeugt native Custom Elements aus einem bewusst kleinen TSX-
Authoring-Modell. Er liefert keine React-, Solid-, Lit-, Stencil- oder Virtual-
DOM-Runtime aus. TSX ist nur die deklarative Syntax fuer eine statisch
analysierbare Template-Beschreibung.

Die Architektur folgt diesen Leitplanken:

* Rust besitzt Compiler-Semantik: Parsing, AST-Analyse, Validierung,
  Transform- und Codegen-Entscheidungen.
* TypeScript besitzt Host-Integration: Authoring-Typen, Package-Ergonomie,
  Vite-Plugin, Beispielprojekte und Type-Tests.
* OXC ist die Parser- und AST-Grundlage fuer TypeScript/TSX.
* Die native Node-Grenze ist grob und typed: ein Workflow-Call transformiert ein
  Modul, statt viele kleine Helpers ueber N-API zu orchestrieren.
* Generierte oder abgeleitete TypeScript-Typen duerfen nicht manuell vom
  nativen Vertrag driften.
* Runtime-Code bleibt klein und stabil: Attribute-Konvertierung, Event-
  Erstellung, Update-Scheduling, Style-Adoption und Define-Guards sind erlaubt;
  Render-Diffing, VDOM und Framework-Abstraktionen sind ausgeschlossen.

## Project Language Policy

English is the project language. All future public interfaces, package names,
API types, generated diagnostics, code comments, examples, README content,
guides, ADRs, and implementation documentation must be written in English.
Existing German planning notes do not need to be translated before the next
implementation milestones begin.

## Commit-Regeln

Alle Commits verwenden Conventional Commits. Ein Meilenstein darf mehrere
Commits haben, aber nie weniger als einen. Commits sollen klein genug bleiben,
dass ein Review den Zweck und die Akzeptanzkriterien des jeweiligen Schritts
nachvollziehen kann.

Empfohlene Typen:

* `docs:` fuer Planung, ADRs, API- und Authoring-Dokumentation.
* `build:` fuer Workspace-, Cargo-, pnpm-, N-API- und Packaging-Infrastruktur.
* `feat:` fuer neue Compiler-, Runtime-, API- und Plugin-Faehigkeiten.
* `test:` fuer Rust-, TypeScript-, Fixture-, Snapshot- und Browser-Tests.
* `chore:` fuer Verifikationsskripte, Release-Checklisten und Repo-Pflege.
* `fix:` fuer Korrekturen an bereits eingefuehrtem Verhalten.

## M0: Projektplanung und Architekturentscheidung

### Zweck

Die vorhandene Spezifikation wird in einen entscheidungsklaren Umsetzungsplan
ueberfuehrt. Der Plan verankert Rust-first, OXC, typed N-API und die Grenze
zwischen Compiler, TypeScript-Hostschicht und Tiny Runtime.

### Scope

* `docs/initial.md` als Spezifikationsgrundlage versionieren.
* Diesen Meilenstein-Plan unter `docs/milestones.md` hinzufuegen.
* Architekturprinzipien und Commit-Disziplin festhalten.
* Risiken und offene Entscheidungen fuer spaetere Meilensteine benennen.

### Out of Scope

* Repo-Scaffold, Cargo Workspace oder pnpm Workspace.
* Compiler-, Runtime-, Vite- oder Beispielcode.
* Auswahl eines finalen Package-Namens jenseits der Arbeitsbezeichnung
  Iktia.

### Deliverables

* Versionierte Ausgangsspezifikation.
* Versionierter Meilenstein-Plan.
* Commit-Plan mit mindestens einem Commit pro Meilenstein.

### Akzeptanzkriterien

* Jeder Meilenstein nennt Zweck, Scope, Out of Scope, Deliverables,
  Akzeptanzkriterien, Tests und geplante Commits.
* Kein Meilenstein bleibt ohne Conventional-Commit-Titel.
* Keine offenen Platzhalter-Markierungen bleiben im Dokument.

### Tests und Pruefkommandos

```sh
git diff -- docs/initial.md docs/milestones.md
rg -n "TO""DO|TB""D|FIX""ME" docs/initial.md docs/milestones.md
git status --short
```

### Geplante Commits

* `docs: add compiler milestone plan`

## M1: Monorepo- und Toolchain-Scaffold

### Zweck

Das Projekt bekommt eine tragfaehige Rust- und TypeScript-Struktur, die die
spaeteren Compiler-, Binding-, Runtime- und Vite-Pakete aufnehmen kann.

### Scope

* pnpm Workspace mit Root-`package.json`, `pnpm-workspace.yaml`, gemeinsamen
  Scripts und Node-Engine.
* Cargo Workspace mit `iktia-core` und `iktia-node`.
* Package-Skeletons fuer Iktia und `@iktia/compiler`.
* Lints nach Ferrocat/Palamedes-Muster: strikte Rust-Lints, Clippy-Warnungen,
  TypeScript-Check, Oxlint/Oxfmt oder lokale aequivalente Repo-Standards.
* Minimale CI-nahe Verifikationsscripts im Root.

### Out of Scope

* Funktionsfaehige TSX-Transformation.
* Native Binary Distribution fuer alle Plattformen.
* Public Release-Konfiguration.

### Deliverables

* Leerer, aber baubarer Rust Workspace.
* TypeScript-Pakete mit Build- und Typecheck-Scripts.
* Einheitliche lokale Kommandos fuer `check`, `test`, `lint` und `build`.

### Akzeptanzkriterien

* `pnpm install` erzeugt eine reproduzierbare Lockfile.
* `cargo check --workspace` laeuft ohne Warnungen.
* `pnpm check-types` laeuft auf den vorhandenen Package-Skeletons.
* Root-Scripts dokumentieren die Standard-Verifikation.

### Tests und Pruefkommandos

```sh
pnpm install
pnpm check-types
cargo check --workspace
cargo test --workspace
```

### Geplante Commits

* `build: add pnpm workspace`
* `build: add rust workspace`
* `chore: add shared lint and typecheck scripts`

## M2: TypeScript Authoring API und Typinterface

### Zweck

Entwickler koennen Komponenten mit einer stabilen, typisierten API schreiben,
bevor der Compiler alle Faelle transformiert. Die Typflaeche ist ein zentrales
Produktmerkmal, nicht nur ein Implementierungsdetail.

### Scope

* `component()`, `prop<T>()`, `prop.string`, `prop.boolean`, `prop.number`,
  `state<T>()`, `event<T>()`, `onConnected()` und `onDisconnected()` als
  TypeScript-API.
* JSX Runtime Type Surface fuer das Authoring-Modell.
* Intrinsic-Element-Typen fuer HTML-Elemente, Slots, Standardattribute,
  `class`, `part`, `data-*`, `aria-*` und DOM-Eventhandler.
* Typisierte Events mit `emit(detail)` und Event-Konfiguration.
* Runtime-Stubs, die klare Fehler werfen, wenn Authoring-Funktionen ausserhalb
  des Compiler-Kontexts ausgefuehrt werden.

### Out of Scope

* Generierte `HTMLElementTagNameMap`-Erweiterungen.
* React-Adaptertypen.
* Vollstaendige DOM-Typmodellierung aller seltenen Attribute.

### Deliverables

* Public Package Iktia.
* Exportierte Authoring-Typen und JSX Runtime Types.
* Type-Test-Fixtures fuer gueltige und ungueltige Nutzung.

### Akzeptanzkriterien

* Falsche Event-Details schlagen im Typecheck fehl.
* Prop-Defaults bestimmen den erwarteten Rueckgabetyp.
* `prop.boolean` und `prop.number` sind getrennt typisiert.
* Autorenseitiger Import aus Iktia und TSX-Konfiguration funktionieren in
  einer isolierten Fixture.

### Tests und Pruefkommandos

```sh
pnpm check-types
pnpm --filter Iktia test
```

### Geplante Commits

* `feat: add Iktia authoring types`
* `feat: add jsx runtime type surface`
* `test: add authoring type tests`

## M3: Rust/OXC Compiler-Core

### Zweck

Der native Core erkennt erlaubte `.wc.tsx`-Komponenten, extrahiert das
Komponentenmodell und lehnt nicht statisch analysierbare Muster mit klaren
Diagnosen ab.

### Scope

* OXC-Parsing fuer TypeScript/TSX mit Dateinamen-basierter `SourceType`-
  Erkennung.
* Analyse von `component("x-name", options?, () => { ... return <... /> })`.
* Extraktion von Props, State, Events, Styles, Shadow-DOM-Option und
  Auto-/Manual-Define-Modus.
* Template-IR fuer statische DOM-Struktur, Text-Bindings, Attribut-/Property-
  Bindings, Event Listener und Slots.
* Fehler fuer dynamische Tags, Listen, komplexe Bedingungen und nicht
  unterstuetzte Call-Patterns.

### Out of Scope

* Finaler JavaScript-Codegen.
* Source Maps.
* Dependency-genaue Update-Slots.
* Listen und keyed updates.

### Deliverables

* `iktia-core` mit oeffentlicher `analyze_component_module()`-API.
* Strukturierte Rust-IR-Typen mit Dokumentation.
* Parser- und Analyse-Fehler mit Positionen, soweit OXC-Spans verfuegbar sind.
* Fixtures fuer Button, Counter und bewusst ungueltige Komponenten.

### Akzeptanzkriterien

* Gueltige Counter- und Button-Komponenten erzeugen erwartete IR.
* Dynamic component tags werden mit einer nutzerverstaendlichen Meldung
  abgelehnt.
* Unsupported lists werden explizit als Nicht-MVP diagnostiziert.
* Rust-Tests decken erfolgreiche Analyse und Fehlerpfade ab.

### Tests und Pruefkommandos

```sh
cargo test --workspace
cargo clippy --all-targets --all-features -- -D warnings
```

### Geplante Commits

* `feat: parse wc tsx components with oxc`
* `feat: analyze props state events and jsx template`
* `test: add compiler analysis fixtures`

## M4: Codegen fuer native Custom Elements

### Zweck

Aus der IR entsteht lesbarer ESM-Code, der native Custom Elements ohne
Framework-Runtime definiert.

### Scope

* Generierung von `HTMLElement`-Subklassen.
* Shadow-DOM-Setup und Light-DOM-Option.
* Property Getter/Setter, `observedAttributes`, `attributeChangedCallback` und
  Attribut-zu-Property-Konvertierung fuer string, boolean und number.
* Lokaler State mit `get`, `set`, `update`-Semantik im generierten Code.
* DOM-Erzeugung fuer statische Struktur.
* Einfache Full-Binding-Refresh-Funktion `#update()`, die alle dynamischen
  Bindings aktualisiert, ohne den DOM-Baum neu aufzubauen.
* Event Listener und CustomEvent-Dispatch.
* Auto-Define und Manual-Define Output.

### Out of Scope

* Feingranulares Dependency-Tracking pro Binding.
* Hydration oder SSR.
* Form-associated Custom Elements.
* Optimierte Bundle-Minimierung.

### Deliverables

* `transform_component_module()` im Rust-Core mit Codegen.
* Snapshot-Tests fuer Counter und Button.
* Lesbarer ESM-Output mit stabilen privaten Feldern und Helpern.

### Akzeptanzkriterien

* Counter-Output enthaelt keine Imports aus React, Solid, Lit oder Stencil.
* Prop- und State-Aenderungen aktualisieren Text und Attribute im generierten
  Code.
* Manual-Define-Modus exportiert eine Define-Funktion statt sofort zu
  registrieren.
* Snapshots sind stabil genug fuer Review.

### Tests und Pruefkommandos

```sh
cargo test --workspace
cargo clippy --all-targets --all-features -- -D warnings
```

### Geplante Commits

* `feat: generate custom element classes`
* `feat: generate prop attribute state and event wiring`
* `test: add generated counter snapshots`

## M5: Typed N-API Boundary und Node Wrapper

### Zweck

Die TypeScript-Welt ruft den nativen Compiler ueber eine grobe, typed N-API-
Operation auf. Der Rust-Core bleibt frei von N-API-Abhaengigkeiten.

### Scope

* `iktia-node` als `cdylib` mit `napi-rs`.
* Typed Request/Response-Objekte fuer `transformComponent`.
* Fehlerkonvertierung von Rust-Fehlern zu Node-Errors mit Dateikontext.
* `@iktia/compiler` als duenne TypeScript-Schicht fuer Plattformauflösung
  und ergonomische Exports.
* Generierte oder abgeleitete TypeScript-Typen aus dem Binding-Vertrag.

### Out of Scope

* Vollstaendige Plattformpakete fuer Release.
* WASM-Distribution.
* Mehrere native Workflow-Calls fuer Analyse, Codegen und Source Maps.

### Deliverables

* Native Binding mit einem Transform-Workflow.
* TypeScript Wrapper mit stabilen Public Types.
* Tests fuer erfolgreiche Transformation und Fehlerweitergabe.

### Akzeptanzkriterien

* TypeScript ruft genau den nativen Transform-Workflow fuer normale Builds auf.
* Keine JSON-String-Transportgrenze zwischen Wrapper und Binding.
* Binding-Types driften nicht von Wrapper-Types.
* Fehler enthalten mindestens Dateiname und Compiler-Meldung.

### Tests und Pruefkommandos

```sh
cargo test --workspace
pnpm --filter @iktia/compiler test
pnpm check-types
```

### Geplante Commits

* `feat: expose native transform through napi`
* `feat: add compiler wrapper`
* `test: add native wrapper tests`

## M6: Vite-Plugin Vertical Slice

### Zweck

Vite kann `.wc.tsx`-Dateien vor dem normalen TSX-Handling transformieren und den
nativen Compiler in einem realen Bundler-Flow nutzen.

### Scope

* `@iktia/vite` Export mit `iktia(options)`.
* Default-Include `/\.wc\.tsx$/`, Exclude fuer `node_modules`.
* `enforce: "pre"` Transform.
* Plugin-Optionen fuer `include`, `exclude`, `shadow`, `styles` und
  Define-Modus, soweit sie den nativen Workflow konfigurieren.
* Klarer Plugin-Fehlerkontext mit Dateiname.

### Out of Scope

* Vollstaendige Vanilla-Extract-CSS-Extraktion.
* Plugin-Cache-Invalidierung jenseits normaler Vite-Transformation.
* Source Maps, falls M4 noch keine stabilen Map-Daten liefert.

### Deliverables

* Public Vite-Plugin-Export.
* Vitest-Abdeckung fuer Filter, Pass-through und Fehlerfaelle.
* Dokumentierter Minimal-Config-Snippet.

### Akzeptanzkriterien

* Nicht passende Dateien werden unveraendert durchgereicht.
* Passende `.wc.tsx`-Dateien werden durch den nativen Workflow transformiert.
* Parser-/Compilerfehler erscheinen als Vite-Fehler mit Dateikontext.
* Plugin funktioniert mit Vite Build in einer Fixture.

### Tests und Pruefkommandos

```sh
pnpm --filter Iktia test
pnpm check-types
```

### Geplante Commits

* `feat: add vite plugin transform`
* `test: add vite plugin filter tests`

## M7: Beispiel-App und Browser-Smoke-Test

### Zweck

Der Vertical Slice wird in einer echten Vite-App validiert. Der Test beweist,
dass der Output im Browser als native Web Component laeuft.

### Scope

* `examples/counter` mit Vite und einer `x-counter.wc.tsx`.
* Nutzung von Props, State, Click-Event und CustomEvent.
* Minimaler HTML-Consumer ohne React/Solid Runtime.
* Browser-Smoke-Test mit Playwright oder Vitest-Browser-Umgebung.

### Out of Scope

* React-, Angular- oder Vue-Consumer-Beispiele.
* Design-System-Qualitaet oder komplexes Styling.
* Benchmarking.

### Deliverables

* Baubare Counter-Beispiel-App.
* Browser-Test fuer Rendering, Klick-Update und Event-Detail.
* README oder Doc-Abschnitt fuer das Beispiel.

### Akzeptanzkriterien

* `x-counter` rendert im Shadow DOM oder konfigurierten DOM-Modus.
* Click inkrementiert sichtbaren Text.
* CustomEvent `change` enthaelt ein numerisches `detail`.
* Bundle enthaelt keine Framework-Runtime fuer Rendering.

### Tests und Pruefkommandos

```sh
pnpm --filter ./examples/counter build
pnpm --filter ./examples/counter test
```

### Geplante Commits

* `test: add counter example app`
* `test: add browser smoke test for compiled component`

## M8: Styling, Slots und Shadow-DOM-MVP

### Zweck

Der MVP deckt Web-Component-zentrale Features ab: Slots, Parts, Shadow-DOM-
Styles und eine brauchbare Styling-Grenze.

### Scope

* `<slot />` und `<slot name="...">`.
* `part`-Attribute im Template.
* `styles`-Option fuer Shadow-DOM-CSS-Injection.
* Style-Tag-Injection als Baseline.
* Optionaler `adoptedStyleSheets`-Modus, falls die Codegen-Grenze bereits
  stabil genug ist.
* Class-Imports bleiben TypeScript-validiert und werden im Output nicht
  semantisch umgeschrieben.

### Out of Scope

* Vollautomatische Vanilla-Extract-Bundle-Analyse.
* CSS Custom Property Design-System-Generator.
* Legacy-Browser-Fallbacks ausser Style-Tag-Injection.

### Deliverables

* Slot-Codegen und Tests.
* Style-Injection-Helfer oder inline generierter Style-Code.
* Fixture fuer Shadow-DOM-Styling mit `part` und CSS Custom Properties.

### Akzeptanzkriterien

* Default- und named slots funktionieren im Beispiel.
* Shadow Root enthaelt die erwarteten Styles.
* `part` bleibt im generierten DOM erhalten.
* Light-DOM-Modus injiziert keine Shadow Styles.

### Tests und Pruefkommandos

```sh
cargo test --workspace
pnpm --filter ./examples/counter test
pnpm check-types
```

### Geplante Commits

* `feat: support slots in generated components`
* `feat: inject shadow dom styles`
* `test: add shadow dom styling fixture`

## M9: Dokumentation und MVP-Abschluss

### Zweck

Der MVP wird nutzbar dokumentiert und mit einer reproduzierbaren
Verifikationscheckliste abgeschlossen.

### Scope

* Authoring Guide fuer Props, State, Events, Slots, Styling und Vite-Config.
* Dokumentation der Compiler-Limits und absichtlich abgelehnten Patterns.
* Troubleshooting fuer Vite-Plugin, native Binding-Fehler und Runtime-Stubs.
* MVP-Verifikationscheckliste.
* Release-Vorbereitung fuer interne oder erste oeffentliche Nutzung.

### Out of Scope

* Vollstaendige Marketing-Website.
* API-Stabilitaetsversprechen fuer 1.0.
* Cross-Framework-Wrapper.

### Deliverables

* `docs/authoring.md`
* `docs/compiler-limitations.md`
* `docs/mvp-verification.md`
* Aktualisierte README mit Quickstart.

### Akzeptanzkriterien

* Ein neuer Nutzer kann den Counter aus der Dokumentation bauen.
* Alle Nicht-MVP-Features aus `docs/initial.md` sind als Limits sichtbar.
* Die Verifikationscheckliste nennt alle lokalen Befehle fuer Rust, TypeScript
  und Beispiel-App.
* Docs enthalten keine Platzhalter oder widerspruechlichen Scope-Aussagen.

### Tests und Pruefkommandos

```sh
rg -n "TO""DO|TB""D|FIX""ME" README.md docs
pnpm check-types
cargo test --workspace
pnpm --filter ./examples/counter build
```

### Geplante Commits

* `docs: add authoring guide`
* `docs: add compiler limitations`
* `chore: prepare mvp verification checklist`

## Risiken und offene Entscheidungen

### Native Packaging-Komplexitaet

Palamedes zeigt, dass platform-spezifische native Pakete ein eigenes
Produktstueck sind. M5 soll lokale Native-Nutzung stabil machen; eine breite
Distribution ueber optionale Plattformpakete wird erst nach dem MVP finalisiert.

### Source-Map-Timing

Palamedes hat Source Maps in den nativen Transform gezogen, um UTF-8/OXC-Spans
nicht durch JavaScript-UTF-16-Indizes zu verzerren. Fuer dieses Projekt gilt:
M1 bis M7 duerfen ohne Source Maps landen, aber sobald Source Maps eingefuehrt
werden, gehoeren sie in den Rust-Transform-Workflow.

### Vanilla-Extract und Shadow DOM

Die Spezifikation zielt auf TypeScript-validierte Style-Imports und
Shadow-DOM-Injection. Der erste sichere Schritt ist explizite CSS-String- oder
Style-Option-Injection. Vollautomatische Vanilla-Extract-Asset-Aufloesung wird
erst geplant, wenn Vite-Plugin und Codegen stabil sind.

### Statisch analysierbare TSX-Grenze

Die Compiler-DX haengt an klaren Grenzen. Dynamische Tags, freie `items.map()`
Listen, Children-as-functions und komplexe Effekte werden abgelehnt, bis es
dafuer explizite Compiler-Konstrukte wie spaeteres `<For>` gibt.

### Typinterface als Produktversprechen

Die TypeScript-API darf nicht nachtraeglich als lose Runtime-Huelle entstehen.
M2 muss vor oder parallel zu Compiler-Features sicherstellen, dass Prop-, State-
und Event-Nutzung fuer Autoren solide typisiert ist.

## MVP-Abschlusskriterien

Der MVP gilt als abgeschlossen, wenn diese Punkte erfuellt sind:

* Eine Counter- und eine Button-Komponente koennen in `.wc.tsx` geschrieben und
  ueber Vite gebaut werden.
* Der Browser fuehrt native Custom Elements ohne React/Solid/Lit/Stencils-
  Runtime aus.
* Props und Attribute synchronisieren fuer string, boolean und number.
* Lokaler State aktualisiert DOM-Bindings.
* Custom Events werden mit typisiertem Authoring und korrektem Browser-Detail
  ausgeliefert.
* Shadow DOM, Slots, Parts und einfache Style-Injection funktionieren.
* Rust-, TypeScript-, Vite-Plugin- und Browser-Smoke-Tests laufen lokal.
* Die Dokumentation beschreibt Authoring, Limits und Verifikation.
