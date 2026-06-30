# Review: RFC 0004 – Component Instance Factory Semantics

Status: Review (independent assessment)
Date: 2026-06-19
Reviews: [RFC 0004](0004-component-instance-factory-semantics.md)
Purpose: Unabhängige Bewertung der RFC-0004-Entscheidung und Ableitung eines
konkreten Compiler-Verbesserungspfads. Das Dokument ist selbsttragend
geschrieben, damit jede Behauptung gegen Code (Datei:Zeile) oder externe Quelle
(URL) gegengeprüft werden kann. Eine Verifikations-Checkliste steht am Ende.

---

## 1. Kernthesen

1. **Die Entscheidung der RFC ist richtig** (Option B: Single-JSX-Return mit
   definierter Instance-Factory-Semantik), **aber unter Wert begründet**. Die RFC
   stützt sich auf „compiler-first identity" und Migrationskosten; die stärkeren,
   empirischen Argumente (Solid/Svelte 5/Marko 6) fehlen.
2. **Der Bezugsrahmen ist falsch gewählt.** Die RFC verhandelt die Frage als
   „Remix vs. Naos". Remix v3 ist für genau diese Frage das schwächste Vorbild
   (runtime-first, render-repeated, erzeugt keine Custom Elements). Die relevante
   Referenzklasse ist die compiler-basierte Setup-once-Familie.
3. **Die eigentliche Hebelwirkung liegt nicht in der Syntax, sondern in der
   Update-Semantik darunter** — und die ist heute grobkörnig. Hier ist genau der
   Punkt, an dem „den Compiler smarter machen, um Komponenten einfacher zu
   halten" greift, und an dem Solid/Svelte/Marko konkret etwas beibringen. Dieser
   Hebel ist **orthogonal zur Syntaxfrage**: Er gilt für Option B genauso.
4. **Der übertragbare Remix-Beitrag ist abortable async work plus ein echtes
   `host()`-Instance-Handle** — beides unabhängig von der Komponentenform.

Teil A bewertet die RFC-Entscheidung. **Teil B ist der Schwerpunkt**: der
Compiler-Verbesserungspfad. Teil C behandelt den Remix-Rest. Teil D fasst
Empfehlungen und Auswirkungen auf RFC 0004 zusammen.

---

## 2. Verifizierte Faktenbasis

Die Selbstbeschreibung der RFC über den generierten Output wurde gegen den Code
geprüft und stimmt. Belege:

| RFC-Behauptung | Beleg | Status |
| --- | --- | --- |
| `#props`, `#state` Felder | [codegen.rs:891](../../crates/naos-core/src/codegen.rs) (`emit_bindings`) | bestätigt |
| `#createBindings()` exponiert props/state/computed/events/host | [codegen.rs:891-921](../../crates/naos-core/src/codegen.rs) | bestätigt |
| `#flush()` = update + form-sync + effects | [codegen.rs:1020](../../crates/naos-core/src/codegen.rs) (`emit_flush`) | bestätigt |
| `#update()` wendet generierte DOM-Updates an | [codegen.rs:1203](../../crates/naos-core/src/codegen.rs) (`emit_update`) | bestätigt |
| State-Write schedulet einen Update-Pass | [codegen.rs:924-944](../../crates/naos-core/src/codegen.rs) (`emit_state_binding`) | bestätigt |
| `HostHandle` = `element`/`root`/`signal`/`update()` | [packages/core/src/index.ts:30](../../packages/core/src/index.ts) | bestätigt |
| `host()` minimal, kein `props`/`id`/`queueTask` | [packages/core/src/index.ts:92](../../packages/core/src/index.ts) | bestätigt |
| `return () => <jsx>` wird nicht abgelehnt | kein Diagnostic im Compiler vorhanden | bestätigt (RFC erlaubt das) |

Schlussfolgerung: Die RFC erfindet keine Architektur — sie benennt die
vorhandene korrekt. Option B ist faktisch bereits implementiert.

---

# Teil A — Bewertung der Entscheidung

## A.1 Der falsche Bezugsrahmen

Die entscheidende Achse in der Framework-Landschaft ist **nicht** „eine Funktion
vs. Factory-Funktion", sondern **„Komponentenkörper läuft einmal" vs. „Render
läuft wiederholt"**. Auf dieser Achse steht Naos eindeutig bei der
Setup-once-Familie:

| System | Körper | Reaktivität | VDOM | Compiler/Runtime |
| --- | --- | --- | --- | --- |
| SolidJS | läuft **einmal** | explizite Signals | nein | Compiler + Runtime-Signals |
| Svelte 5 | läuft **einmal** | explizite Runes (`$state`) | nein | Compiler |
| Marko 6 | läuft **einmal** | Tags, wegkompiliert | nein | Compiler |
| **Naos (Option B)** | wird **einmal analysiert** | explizit (`state()`) | nein | Compiler |
| React | render **wiederholt** | `useState`/props | ja | Runtime |
| Lit | `render()` **wiederholt** | reactive properties | nein | Runtime (~5 KB) |
| Stencil | `render()` **wiederholt** | `@Prop`/`@State` | **ja** | Compiler |
| **Remix v3** | innere `()=>JSX` **wiederholt** | plain `let` + `update()` | nein (eigener Renderer) | **runtime-first** |

Zwei Konsequenzen:

**Naos ist konzeptionell „Solid für Custom Elements, als Rust/OXC-Compiler".**
Setup-once + kein VDOM + explizite reaktive Primitive ist exakt das Profil der
modernen Compiler-Generation. Das ist ein empirisches Argument für Option B, das
unabhängig von Naoss Selbstverständnis trägt — und es fehlt in der RFC.

**Remix taugt für diese Frage kaum als Zeuge.** Remix v3 ist runtime-first („The
runtime is the source of truth"), erzeugt keine Custom Elements (nur Interop über
native `CustomEvent`) und ist noch nicht produktionsreif (Beta `3.0.0-beta.3`,
„not ready for production"). Seine innere `() => JSX` läuft bei **jedem**
`update()` erneut. Eine an Remix angelehnte Syntax würde Naos ausgerechnet im
entscheidenden Punkt (compiler vs. runtime, once vs. repeated) am Gegenteil
ausrichten.

## A.2 Warum Option A schlechter ist als dargestellt

Die RFC formuliert den Kernnachteil zu weich („*suggests* a runtime component
renderer"). Schärfer:

- **Render-repeated bricht das Kernmodell.** Übernähme Naos Remix' innere
  Funktion, entstünde eine **Divergenz zwischen mentalem Modell und Output**: Der
  Autor schreibt „läuft bei jedem Render", der Compiler erzeugt feingranulare
  DOM-Patches. Code, der nur unter echter Re-Execution korrekt ist (lokale
  Berechnungen, Listener-Setup, Zwischenvariablen in der Render-Funktion), wäre
  semantisch falsch oder müsste vom Compiler stillschweigend umgedeutet werden.
- **Bei Naos ist das eine doppelte Fiktion.** Anders als bei Solid/Remix läuft
  bei Naos **kein** Source-Code zur Laufzeit: Die Authoring-APIs sind Stubs, die
  beim Ausführen werfen (ADR 0003), der Body wird zur Compile-Zeit *analysiert*.
  Solid führt sein Setup wenigstens real einmal aus; Naos nie. Eine
  verschachtelte „Render-Funktion" suggeriert damit eine Laufzeit, die es doppelt
  nicht gibt. Die Single-Return-Form ist schlicht ehrlicher: eine Deklaration,
  die der Compiler liest.
- **„plain `let` + update()" ist kein Vorteil, sondern Sveltes verworfener Weg.**
  Die RFC nennt `let state = "idle"` mehrfach „attractive"/„conceptually
  lighter". Genau dieses Modell (implizit reaktives `let`) hatte Svelte — und hat
  es mit Svelte 5 **bewusst zugunsten von explizitem `$state()` aufgegeben**, weil
  implizite Reaktivität nicht über Funktions-/Dateigrenzen skaliert, schlecht
  refactorbar und statisch unzuverlässig ist (Rich Harris, *Introducing runes*).
  Das ist das stärkste verfügbare Argument *für* Naoss `state()` — und es fehlt
  in der RFC. Hinzu kommt: Remix' manuelles `update()` gilt selbst in der
  Remix-Community als Hauptfehlerquelle (vergessenes `update()` → stale UI).

Netto: Option A importiert ein render-repeated-Modell in einen
render-once-Compiler und verkauft eine bereits widerlegte State-Ergonomie als
Fortschritt. Die RFC kommt zum richtigen Schluss, unterschätzt aber, wie
eindeutig er ist.

## A.3 Option C (beide Formen) sollte klarer ausgeschlossen werden

Die RFC lässt einen „future experimental factory mode" offen. Da die
Factory-Form render-repeated-Semantik einführt, die mit dem render-once-Kern
**fundamental** kollidiert, sollte sie nicht als künftiger Modus offengehalten
werden — zwei Modelle bedeuten zwei Analysepfade und zwei Reaktivitätsregeln. Was
man stattdessen offenhalten sollte, sind `host()`-Evolution und abortable async
(Teil C): Sie liefern den realen Remix-Nutzen ohne die Form.

---

# Teil B — Den Compiler smarter machen (Schwerpunkt)

Dies ist der wichtigere Befund. Die RFC streitet über die Komponenten-**Syntax**,
aber das eigentliche Verbesserungspotenzial liegt in der Update-**Semantik**
darunter. Diese Semantik ist heute grobkörnig — und das ist genau der Hebel, an
dem Solid/Svelte/Marko etwas beibringen.

## B.1 Befund: Naoss heutiges Update-Modell ist coarse-grained

Belegt am generierten Code. Naos hat das grobe Skelett richtig (kein VDOM,
direkte DOM-Ops, Dirty-Vergleich beim Attribut-Schreiben), aber **keine
feingranulare Selektivität**. Konkret:

**(1) Kein Dependency-Tracking — irgendeiner Art.** Eine Suche nach
`depend`/`dirty`/`track`/`memo`/`subscribe` im Compiler liefert keine
Tracking-Infrastruktur ([crates/naos-core/src](../../crates/naos-core/src)).
Updates werden nicht entlang eines Datenflussgraphen gefahren.

**(2) `computed()` ist eine reine Funktion ohne Memoization.** Der Generator
emittiert wörtlich `const doubled = () => (count() * 2);`
([codegen.rs:946-957](../../crates/naos-core/src/codegen.rs),
`emit_computed_binding`; bestätigt durch Test-Assertion
[lib.rs:416](../../crates/naos-core/src/lib.rs)). Jede Referenz im View
re-evaluiert die gesamte Kette. Steht `doubled()` zweimal im View (wie im
RFC-`ClipboardButton`: `aria-label={label()}` und `{label()}`), wird `label`
zweimal pro Update berechnet; liest ein computed weitere computed, multipliziert
sich das.

**(3) `#createBindings()` baut bei jedem Aufruf das komplette Binding-Objekt neu
auf** — alle props, alle state-Accessoren, alle computed-Funktionen, events, host
([codegen.rs:891-921](../../crates/naos-core/src/codegen.rs)) — und wird in
`#update()`, `#runEffects()` und `#syncFormValue()` je erneut aufgerufen.

**(4) `#runEffects()` cleant und re-runt ALLE Effects bei JEDEM `#flush()`.** Es
gibt keine per-Effect-Bedingung ([codegen.rs:970-1019](../../crates/naos-core/src/codegen.rs),
`emit_effects`/`emit_effect_body`). Semantisch entspricht Naoss `effect()` damit
einem React-`useEffect` **ohne** Dependency-Array.

**(5) `state.set()` flusht synchron — kein Batching.** Jeder Write ruft sofort
`this.#flush()` ([codegen.rs:933](../../crates/naos-core/src/codegen.rs)). Drei
Writes in einem Handler = drei vollständige flush-Zyklen (3× alle Bindings, 3×
alle DOM-Updates, 3× alle Effects). Das Combobox-Muster
`selected.set(); input.set(); open.set()` löst genau das aus.

**(6) Fair gegengerechnet — was es schon gibt:** Attribut-Schreibvorgänge haben
einen Dirty-Vergleich (`if (this.getAttribute(name) !== String(next)) …`,
[codegen.rs:765](../../crates/naos-core/src/codegen.rs)); `#update()` hat einen
`if (!this.#mounted) return`-Guard; Effect-Cleanups laufen ordentlich vor Re-Run.
Der Dirty-Vergleich verhindert unnötige DOM-Mutationen — aber der **Wert** wird
trotzdem jedes Mal neu berechnet. Gespart wird am DOM, nicht an der Reaktivität.

**Einordnung:** Naos ist heute näher an „React ohne VDOM" (alles neu bei jeder
Änderung, nur das DOM-Schreiben ist verglichen) als an Solid/Marko (nur
Betroffenes neu). Das ist die eigentliche Lücke zu den Systemen, von denen die
RFC lernen will — und sie hat mit der Syntaxfrage nichts zu tun.

## B.2 Das sichtbare Symptom: `void state()` in den Primitives

In mehreren Primitives stehen Lese-Ausdrücke ohne Verwendung:

- [menu.wc.tsx:66-67](../../packages/primitives/src/menu.wc.tsx): `void expanded()` / `void highlighted()`
- [combobox.wc.tsx:100-102](../../packages/primitives/src/combobox.wc.tsx): `void selected()` / `void input()` / `void open()`

Gemeint sind sie offensichtlich als Dependency-Marker („führe diesen Effect aus,
wenn sich das ändert"). **Funktional bewirken sie heute aber nichts**: Da
`#runEffects()` ohnehin alle Effects bei jedem flush laufen lässt (B.1 Punkt 4),
ist `void expanded()` ein No-op (`void (() => this.#state.expanded)()`). Diese
Marker sind ein Symptom: Sie antizipieren ein fine-grained Tracking, das es nicht
gibt. Sie verschwinden (oder werden bedeutungstragend), sobald der Compiler
Dependencies kennt.

Verwandtes Symptom: `void form` / `void name` in
[combobox.wc.tsx:63](../../packages/primitives/src/combobox.wc.tsx) — hier
unterdrückt `void` einen „unused"-Lint, weil `formControl({…})` als deklarative
Compiler-Direktive aufgerufen wird, deren Rückgabewert ungenutzt bleibt. Auch das
ist Compiler-Reibung, die in die Authoring-Quelle durchschlägt.

## B.3 Was Solid / Svelte / Marko hier konkret beibringen

| Aspekt | Naos heute | Solid | Svelte 5 | Marko 6 |
| --- | --- | --- | --- | --- |
| Update-Granularität | alles bei jedem flush | nur betroffene Bindung | nur betroffene Bindung | nur betroffene Bindung |
| Dependency-Erfassung | keine | Runtime-Auto-Track | Compiler + Signals | **Compiler (wegkompiliert)** |
| `computed`/derived | nicht memoisiert | `createMemo` (cached) | `$derived` (cached) | `<const>` (cached) |
| Effect-Trigger | jeder flush | nur gelesene Signals | nur gelesene Runes | nur gelesene Tags |
| Batching | synchron pro Write | gebatcht | gebatcht | gebatcht |

Der entscheidende Punkt für Naos als **Compiler**: Solid trackt zur **Laufzeit**
(Signals subscriben beim Lesen). Naos kann dasselbe Ergebnis zur **Compile-Zeit**
erreichen, weil der Compiler den gesamten Komponenten-Body statisch sieht und
weiß, welche `state`/`prop`/`computed` jede Binding-Expression und jeder
Effect-Body liest. Das ist exakt Markos Modell („compiles away the reactivity")
und die natürliche Richtung für ein Rust/OXC-Projekt — ADR 0009 (OXC-AST-Analyse
vor API-Erweiterung) ist die Grundlage dafür.

## B.4 Vier konkrete Hebel

Geordnet nach Verhältnis von Wirkung zu Aufwand. Alle vier sind reine
Compiler-Verbesserungen und ändern die öffentliche Authoring-Syntax **nicht** —
sie machen sie nur billiger und in einem Fall (H3) einfacher.

### H1 — Compile-time Dependency-Graph für DOM-Bindings

**Was.** Statt in `#update()` alle `update_lines` bedingungslos zu fahren, erzeugt
der Compiler pro reaktiver Quelle die Liste der abhängigen DOM-Operationen und
ruft beim Write nur diese auf. `set count` → nur die Text-/Attribut-Knoten
aktualisieren, die `count` (direkt oder über computed) lesen.

**Beleg heute.** `emit_update` iteriert `self.update_lines` ohne Quellbezug
([codegen.rs:1203-1216](../../crates/naos-core/src/codegen.rs)).

**Vorbild.** `babel-plugin-jsx-dom-expressions` (Solid) wickelt jede dynamische
Bindung in einen eigenen reaktiven Computation-Wrapper; Marko spaltet die
Komponente „in eine Funktion pro reaktivem Atom".

**Umsetzung in Naos.** Beim Lowern jeder Binding-Expression die gelesenen
`state`/`prop`/`computed`-Namen erfassen (AST-Walk, der durch `computed`
hindurch auflöst) → invertieren zu `source → [bindings]` → pro state ein
`#updateCount()` o. Ä. emittieren, das `set` aufruft.

**Effekt auf Primitives.** Geringere Update-Kosten bei jeder Interaktion; die
Grundlage für H3 und H4.

**Grenze/Risiko.** Reads hinter Hilfsfunktionsaufrufen sind statisch nicht
sichtbar (siehe H3-Grenze). Für nicht auflösbare Fälle ist der korrekte Fallback
das heutige „alle Bindings"-Verhalten — niemals weniger. Korrektheit vor
Granularität.

### H2 — Memoisierte computed-Werte

**Was.** `computed()` cached seinen Wert und rechnet nur neu, wenn eine seiner
Quellen sich geändert hat (createMemo-Semantik). Innerhalb eines Update-Passes
wird ein computed höchstens einmal evaluiert, egal wie oft der View es liest.

**Beleg heute.** `const doubled = () => (count() * 2);` — Plain-Funktion, kein
Cache ([codegen.rs:946-957](../../crates/naos-core/src/codegen.rs)).

**Vorbild.** Solid `createMemo`, Svelte `$derived`, Marko `<const>` — alle
gecached.

**Umsetzung.** Baut auf H1 auf: Mit bekanntem Dependency-Graph kann ein computed
als Feld mit Dirty-Flag generiert werden, invalidiert durch seine Quellen.

**Effekt auf Primitives.** Spürbar bei mehrfach gelesenen oder verketteten
computed (z. B. `comboboxApi` wird in View und Effects mehrfach gelesen,
[combobox.wc.tsx](../../packages/primitives/src/combobox.wc.tsx)).

**Grenze/Risiko.** ADR 0006 verlangt reine computed — Voraussetzung für
Memoisierung. Unreine computed müssten diagnostiziert werden.

### H3 — Per-Effect-Dependencies mit Auto-Tracking (eliminiert `void state()`)

**Was.** Ein Effect läuft nur, wenn eine der von ihm gelesenen Quellen sich
geändert hat — statisch ermittelt aus dem Effect-Body. Das macht die
`void state()`-Marker überflüssig: Der Compiler erkennt die gelesenen Signale
selbst.

**Beleg heute.** Alle Effects bei jedem flush
([codegen.rs:970-1019](../../crates/naos-core/src/codegen.rs)); Marker als No-op
(B.2).

**Vorbild.** Solid `createEffect` trackt automatisch; kein Dependency-Array, keine
manuellen Marker.

**Umsetzung.** Denselben Read-Erfassungs-Walk wie H1 auf Effect-Bodies anwenden;
`#runEffects()` so generieren, dass Effekt *i* nur bei Änderung seiner Quellen
cleant+rerunt.

**Effekt auf Primitives — auch Korrektheit, nicht nur Tempo.** Dialog/Menu hängen
document-weite `keydown`/`pointerdown`-Listener in Effects
([dialog.wc.tsx](../../packages/primitives/src/dialog.wc.tsx),
[menu.wc.tsx:79-90](../../packages/primitives/src/menu.wc.tsx)). Heute werden diese
bei **jedem** unbezogenen state-Write ab- und wieder angemeldet. Fine-grained
Effects beenden dieses Listener-Flackern. Und die `void`-Marker fallen weg → die
Authoring-Quelle wird kleiner und ehrlicher. **Das ist „den Compiler smarter
machen, um Komponenten einfacher zu halten" in Reinform.**

**Grenze/Risiko — der wichtige Teil.** Auto-Tracking sieht **nicht** in
Hilfsfunktionen hinein. Genau deshalb stehen die `void`-Marker dort: Der echte
Read steckt in `syncNaosMenuItems({ api, … })`, das intern `api` liest, während
der Body nur `void expanded()` zeigt. Der ehrliche Plan ist zweistufig:

1. **Auto-Track für den 90-%-Fall** (Reads direkt im Effect-Body).
2. **Expliziter Dependency-Escape für den Rest** — analog Solids `on(deps, fn)`:
   eine erst-klassige Form, die Dependencies benennt, wenn der Compiler sie nicht
   sehen kann. Das ersetzt die heutigen No-op-`void`-Marker durch etwas mit
   definierter Compiler-Bedeutung — und macht die Absicht für Leser **und**
   Compiler sichtbar.

Diese Grenze ist auch eine Designleitlinie für `@naos-ui/primitives`: Je mehr
Logik in undurchsichtige Helfer wandert, desto weniger kann der Compiler
optimieren. Schlanke, im Body sichtbare Reads sind nicht nur lesbarer, sie sind
optimierbar.

### H4 — Write-Batching (Microtask-Coalescing)

**Was.** Mehrere `state.set()` innerhalb eines synchronen Blocks lösen **einen**
flush aus, nicht einen pro Write.

**Beleg heute.** `set` ruft `#flush()` synchron
([codegen.rs:933](../../crates/naos-core/src/codegen.rs)); kein Scheduler.

**Vorbild.** Remix batcht „into one microtask to deduplicate renders"; Solid/Svelte
batchen ebenfalls. ADR 0013 erlaubt „scheduling helpers" in `@naos-ui/runtime`
explizit — der vorgesehene Ort dafür.

**Umsetzung.** `set` markiert dirty und queued einen Microtask-flush; `host()
.update()` und Lifecycle nutzen denselben Scheduler. Optional eine synchrone
`flushSync`-Escape für Fälle, die sofortiges DOM brauchen (Fokus-Management).

**Effekt auf Primitives.** Die Zag-Callbacks setzen oft mehrere states
nacheinander (combobox/date-picker/editable). Batching macht aus N flushes einen
und reduziert den Bedarf an manuellem `host().update()` (z. B. in
[toast-root.wc.tsx](../../packages/primitives/src/toast-root.wc.tsx)).

**Grenze/Risiko.** Verändert das Timing-Verhalten — braucht Tests, besonders an
der DSD-Hydrationsgrenze und bei Form-Sync-Reihenfolge.

## B.5 Reihenfolge und Verhältnis zu v0.1

H1 ist die Grundlage; H2 und H3 bauen darauf auf; H4 ist weitgehend unabhängig
und sofort nützlich. Empfohlene Folge: **H4 → H1 → H3 → H2** (früher Gewinn durch
Batching, dann der Graph, dann die beiden granularen Nutznießer).

Wichtig für den v0.1-Scope: **Keiner dieser Hebel ändert die öffentliche
Syntax** (ADR 0011 bleibt unberührt), mit der einzigen additiven Ausnahme des
expliziten Dependency-Escape in H3 — und der ist eine *Erweiterung*, kein
Bruch. Der korrekte Fallback jedes Hebels ist das heutige Verhalten, sodass die
Verbesserungen inkrementell und ohne Big-Bang einführbar sind. Das macht diesen
Pfad mit der RFC-0004-Empfehlung (Option B, minimale Syntaxänderung) voll
kompatibel: Option B legt das ehrliche Mentalmodell fest; Teil B macht das Modell
darunter effizient.

---

# Teil C — Was von Remix tatsächlich zu übernehmen ist

Unabhängig von Syntax (Teil A) und Reaktivität (Teil B) bleibt Remix' echter
Beitrag. Die RFC erkennt ihn, gewichtet ihn aber als „neutral/später" zu niedrig.

## C.1 Abortable async work — priorisieren

Remix hat drei sauber getrennte Signal-Ebenen (offizielle API-Referenz
bestätigt):

| Signal | aborted bei | in Naos |
| --- | --- | --- |
| `handle.signal` | disconnect/unmount | **vorhanden** (`host().signal`) |
| Render-Signal aus `update(): Promise<AbortSignal>` | nächstem Re-Render / Entfernen | fehlt |
| Event-Signal (2. Arg im Handler) | Re-Entry / disconnect | fehlt |

Naos hat nur Ebene 1. Die Lücke ist konkret und entscheidet über Korrektheit bei
asynchroner Event-Logik (stale Responses nach Re-Render). Das gehört als
benanntes, priorisiertes Follow-up in die RFC, nicht in „Open Questions".

## C.2 `host()` zum echten Instance-Handle — differenziert begründen

Die Richtung (`props`, `id`, `update(): Promise<AbortSignal>`, `queueTask`) ist
richtig. Aber die `id`-Begründung der RFC sollte präzisiert werden:

Die Primitives nutzen 29× **feste** ID-Strings (`id: "naos-combobox"` usw.,
[combobox.wc.tsx:73](../../packages/primitives/src/combobox.wc.tsx)), die via
[scope.ts:17](../../packages/primitives/src/internal/zag/scope.ts) (`id =
host.id`) an Zag fließen und dort zu DOM-IDs werden. Das ist **kein** akuter
Mehrinstanz-Kollisions-Bug, weil Naos in (Declarative) Shadow DOM rendert und
IDs damit pro ShadowRoot gescoped sind. Die legitimen Treiber für `host().id`
sind andere:

- **Hydration-Determinismus**: SSR-ID muss die Client-ID treffen — eine *stabile*
  ID ist hier erwünscht, eine zufällige verboten.
- **Cross-Boundary-ARIA**: Light-DOM-Label → Shadow-DOM-Input funktioniert nur mit
  exponierter, eindeutiger ID.

`host().id` sollte aus diesen Gründen kommen, nicht über einen suggerierten Bug.

---

# Teil D — Empfehlungen

## D.1 Entscheidung

**Option B annehmen** — bestätigt. Zusätzlich:

- Comparison/Context der RFC umbauen: primäre Referenz = Solid/Svelte 5/Marko 6
  (Setup-once, kein VDOM, explizite Primitive); Remix als Sonderfall einordnen,
  nicht als Maßstab.
- Option-A-Nachteile schärfen (render-repeated, Modell/Output-Divergenz, „plain
  `let`" als Svelte-4→5-Rückschritt).
- Factory-als-Zukunftsmodus streichen (A.3).
- `host().id`-Begründung auf Hydration/cross-boundary-ARIA umstellen (C.2).
- Abortable async (C.1) von „Open Question" zu priorisiertem Follow-up.

## D.2 Compiler-Roadmap (eigener Folge-RFC vorgeschlagen)

Teil B verdient einen eigenen RFC „Fine-grained Reactive Codegen", weil er die
größte Hebelwirkung auf Komponenten-Einfachheit hat und von der Syntaxfrage
unabhängig ist:

1. **H4 Write-Batching** — Microtask-Scheduler in `@naos-ui/runtime` (ADR-0013-konform).
2. **H1 Compile-time Dependency-Graph** — Read-Erfassung pro Binding, selektives `#update`.
3. **H3 Per-Effect-Dependencies + Auto-Tracking** — eliminiert `void state()`; expliziter Dependency-Escape für Helfer-Fälle.
4. **H2 computed-Memoisierung** — baut auf H1 auf.

Leitprinzip für alle: **Korrektheit vor Granularität** — nicht auflösbare Reads
fallen auf das heutige „alles aktualisieren"-Verhalten zurück, nie auf weniger.

---

## Quellen

Extern:
- Remix 3 Beta Preview — https://remix.run/blog/remix-3-beta-preview
- Remix `Handle` API — https://api.remix.run/api/remix/ui/interface/Handle/
- Remix `EntryComponent` API — https://api.remix.run/api/remix/ui/type/EntryComponent/
- SolidJS – Intro to reactivity — https://docs.solidjs.com/concepts/intro-to-reactivity
- SolidJS – Fine-grained reactivity — https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity
- babel-plugin-jsx-dom-expressions — https://github.com/ryansolid/babel-plugin-jsx-dom-expressions
- Svelte – Introducing runes (Rich Harris) — https://svelte.dev/blog/runes
- Marko – Compiling Fine-Grained Reactivity (R. Carniato) — https://dev.to/ryansolid/marko-compiling-fine-grained-reactivity-4lk4
- FLUURT: Re-inventing Marko — https://dev.to/ryansolid/fluurt-re-inventing-marko-3o1o

Intern (Code, Stand dieses Reviews):
- Codegen: [codegen.rs](../../crates/naos-core/src/codegen.rs) — `emit_bindings` (891), `emit_state_binding` (924), `emit_computed_binding` (946), `emit_effects` (970), `emit_flush` (1020), `emit_update` (1203); Attribut-Dirty-Check (765)
- Public API: [packages/core/src/index.ts](../../packages/core/src/index.ts) — `HostHandle` (30), `computed` (66), `effect` (70), `host` (92)
- Tests: [lib.rs](../../crates/naos-core/src/lib.rs) — state/computed/effect (377)
- Primitives-Symptome: [menu.wc.tsx:66](../../packages/primitives/src/menu.wc.tsx), [combobox.wc.tsx:63,100](../../packages/primitives/src/combobox.wc.tsx), [scope.ts:17](../../packages/primitives/src/internal/zag/scope.ts)
- ADRs: 0003 (TS-Boundary), 0005 (Static Analyzability), 0006 (Reactive Model), 0009 (OXC-AST), 0011 (v0.1 API), 0013 (Tiny Runtime)

---

## Verifikations-Checkliste für die Gegenprüfung

Überprüfbare Behauptungen dieses Reviews:

1. [ ] Kein Dependency-Tracking im Compiler (Suche `depend|dirty|track|memo|subscribe` in `crates/naos-core/src` → keine Tracking-Logik).
2. [ ] `computed` ohne Memoisierung (`emit_computed_binding` erzeugt Plain-Arrow; `lib.rs` Assertion `const doubled = () => (count() * 2);`).
3. [ ] `#runEffects()` läuft alle Effects bei jedem flush (`emit_effects`, keine per-Effect-Bedingung).
4. [ ] `state.set()` flusht synchron, kein Batching (`emit_state_binding`).
5. [ ] Attribut-Schreibvorgänge haben Dirty-Vergleich, Werte werden dennoch neu berechnet (`codegen.rs:765`).
6. [ ] `void state()`-Marker sind heute funktionale No-ops (Folge aus 3).
7. [ ] `host()` minimal, kein `props`/`id`/`queueTask` (`packages/core/src/index.ts:30,92`).
8. [ ] Feste IDs durch Shadow-DOM-Scoping kein akuter Kollisions-Bug (`scope.ts:17` + DSD-Rendering, ADR 0010/0015).
9. [ ] Externe Claims: Remix `update()` gibt `Promise<AbortSignal>` (offizielle API-Referenz); Svelte ging von magic-`let` zu `$state()` (Rich-Harris-Blog); Solid/Marko laufen einmal und tracken fine-grained (offizielle Docs).
10. [ ] Behauptung „kein Hebel in Teil B ändert die öffentliche v0.1-Syntax" (ADR 0011), außer additivem Dependency-Escape in H3.
