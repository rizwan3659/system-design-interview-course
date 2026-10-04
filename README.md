# System Design Interview Course (HLD + LLD)

A 40-hour, interactive, classroom-ready course for system design interviews: 20 sessions of 2 hours each, covering high-level design, low-level design and full mock interviews.

**Open the course:** https://rizwan3659.github.io/system-design-interview-course/

Everything runs in the browser. There is no build step and no backend.

## How each session runs

The course is a learning lab: students predict, calculate, experiment, debug and answer rather than scroll. Every important concept follows one loop:

**Learn → Visualize → Predict → Design → Experiment → Debug → Interview → Check**

A strip under the module tabs shows which of these steps the current module contains; click a step to jump to it. Every architecture change answers four questions: *What problem do we have? Why does the current design fail? What component could solve it? What new problems does it introduce?*

Every 2-hour session has:

- a **class clock** that shows which module should be on screen
- **session tasks** (e.g. "4 / 6 tasks completed"); some tick themselves when you finish the matching lab
- **progressive diagrams** that add one component per stage, with a "predict what happens next" question before each reveal
- **labs**: a traffic-driven scaling lab (with failure injection), plus cache, queue/backpressure, sharding, replication/failover, rate-limiter, consistency, capacity-estimation and latency-intuition labs, alongside the original simulators
- **bottleneck and debugging scenarios** with metrics panels and "why or why not" explanations for every option
- **hints before solutions**, and **design-it-yourself** builders compared against a reference architecture
- an **interview checkpoint**: answer in your own words first, then compare with a structured approach
- **active-recall cards** and a **session summary** ("Can you explain this without notes?") that feed spaced revision
- **teacher notes** at the end of each module

Course-wide pages: **Labs** (filter by 🟢 Foundation / 🟡 Intermediate / 🔴 Interview), **Case studies** (7 extra self-paced systems: YouTube, notification service, Google Drive, ticket booking, autocomplete, web crawler, payments), **Interview practice**, **Revision** (Leitner spaced repetition: 1, 3, 7, 16, 35 days) and **Progress** (completion counts and concept mastery).

Progress, answers and notes are saved in each student's own browser (localStorage), and can be exported or imported as JSON from the Progress page. Nothing is sent anywhere.

## Sessions

### Part A · HLD foundations

| # | Hours | Session | Goal |
|---|---|---|---|
| 1 | 1–2 | [The design interview, requirements and estimation](https://rizwan3659.github.io/system-design-interview-course/#s01) | Learn the 5-step loop, ask the questions that shape a design, and estimate scale in under two minutes. |
| 2 | 3–4 | [Networking basics and API design](https://rizwan3659.github.io/system-design-interview-course/#s02) | Follow a request from the browser to the server and back, and design clean, safe APIs. |
| 3 | 5–6 | [Storage: data modelling, indexes and transactions](https://rizwan3659.github.io/system-design-interview-course/#s03) | Model data, make reads fast with indexes, protect writes with transactions, and choose between SQL and NoSQL. |
| 4 | 7–8 | [Caching and CDNs](https://rizwan3659.github.io/system-design-interview-course/#s04) | Make reads fast and cheap with caches, and handle the hard parts: invalidation, stampedes and hot keys. |
| 5 | 9–10 | [Scaling data: replication, sharding and consistent hashing](https://rizwan3659.github.io/system-design-interview-course/#s05) | Grow beyond one database: copy data for reads and safety, split data for size and writes, and move as little as possible when you add machines. |
| 6 | 11–12 | [Consistency and distributed-system basics](https://rizwan3659.github.io/system-design-interview-course/#s06) | Reason about what users see when data lives on many machines, and keep multi-step operations correct. |
| 7 | 13–14 | [Async processing: queues, streams and events](https://rizwan3659.github.io/system-design-interview-course/#s07) | Move slow or spiky work out of the request path, and make it reliable when messages are lost, delayed or duplicated. |
| 8 | 15–16 | [Reliability, load balancing, rate limiting and observability](https://rizwan3659.github.io/system-design-interview-course/#s08) | Keep a system up when parts fail, protect it from overload, and know when something is wrong. |

### Part B · HLD case studies

| # | Hours | Session | Goal |
|---|---|---|---|
| 9 | 17–18 | [Case study: URL shortener, then a timed Pastebin mock](https://rizwan3659.github.io/system-design-interview-course/#s09) | Run the full loop on a classic read-heavy system, then repeat it alone under interview timing. |
| 10 | 19–20 | [Case study: a chat app like WhatsApp](https://rizwan3659.github.io/system-design-interview-course/#s10) | Design real-time messaging: long-lived connections, delivery to online and offline users, ordering, groups and presence. |
| 11 | 21–22 | [Case study: a news feed like Instagram](https://rizwan3659.github.io/system-design-interview-course/#s11) | Design a read-heavy social feed: posting media, following people, and building each user's feed fast, including for celebrities. |
| 12 | 23–24 | [Case study: ride-hailing like Uber](https://rizwan3659.github.io/system-design-interview-course/#s12) | Design a location-heavy, real-time system: millions of moving drivers, fast nearby search, safe matching and a trip lifecycle. |

### Part C · Low-level design (Python)

| # | Hours | Session | Goal |
|---|---|---|---|
| 13 | 25–26 | [OOP foundations, UML and the LLD interview](https://rizwan3659.github.io/system-design-interview-course/#s13) | Switch from boxes-and-arrows to classes-and-methods: model a problem with objects, draw it in UML, and write the core in Python. |
| 14 | 27–28 | [SOLID principles](https://rizwan3659.github.io/system-design-interview-course/#s14) | Write classes that are easy to change: one reason to change, extend without editing, safe substitution, small interfaces, and dependencies on abstractions. |
| 15 | 29–30 | [Design patterns I: creational and structural](https://rizwan3659.github.io/system-design-interview-course/#s15) | Recognise the problems that Factory, Builder, Singleton, Adapter, Decorator, Facade and Proxy solve, and write each in Python. |
| 16 | 31–32 | [Design patterns II: behavioural](https://rizwan3659.github.io/system-design-interview-course/#s16) | Use Strategy, Observer, State, Command, Chain of Responsibility and Template Method to keep behaviour flexible and code readable. |
| 17 | 33–34 | [LLD case study: parking lot](https://rizwan3659.github.io/system-design-interview-course/#s17) | Run the full LLD loop on the most common LLD prompt: requirements, classes, patterns, working code and extensions. |
| 18 | 35–36 | [LLD case study: elevator system](https://rizwan3659.github.io/system-design-interview-course/#s18) | Design a multi-elevator controller: requests, scheduling algorithms, dispatching between cars, states and failure handling. |
| 19 | 37–38 | [Concurrency in LLD: LRU cache and rate limiter](https://rizwan3659.github.io/system-design-interview-course/#s19) | Write classes that stay correct when many threads use them, through two favourite interview problems. |

### Part D · Capstone

| # | Hours | Session | Goal |
|---|---|---|---|
| 20 | 39–40 | [Capstone: full HLD and LLD mock interviews](https://rizwan3659.github.io/system-design-interview-course/#s20) | Run one full HLD mock and one full LLD mock under real timing, score both with the rubric, and leave with a personal plan. |

## Run it locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk also works in most browsers.

## Project structure

Plain HTML, CSS and JavaScript: no build step and no framework. The block-registry architecture already worked as a component model, so the learning-lab features extend it instead of replacing it.

| Path | What it is |
|---|---|
| `index.html` | Page shell, colour tokens and base styles |
| `css/lab.css` | Styles for the learning-lab components |
| `engine.js` | Router, class clock, hub and session views, and the original block renderers (quizzes, steppers, timers, architecture labs, UML, code) |
| `js/core.js` | Shared `SDC` namespace: storage, view-scoped timers, events, block registry, levels, concepts, activity log, spaced-repetition store |
| `js/models.js` | Pure, deterministic models behind the labs (scaling, sharding, rate limiting, queues, consistency, SRS, mastery). No DOM; unit-tested with Node |
| `js/diagram.js` | Grid-layout SVG diagram renderer, plus the `diagram` (step-through) and `evolve` (progressive architecture) blocks |
| `js/components/*.js` | One file per component: `predict` (prediction, bottleneck, debugging, hints, metrics), `decide` (decision and comparison labs), `interview` (checkpoint), `recall` (recall cards, summary), `tasks`, `capacity`, `latency`, `scalelab`, `cachesim`, `queuesim`, `shardsim`, `replsim`, `ratelimit`, `consistency`, `builder`, `lld` (HLD→LLD map, staged LLD coding labs) |
| `js/pages.js` | Labs, Case studies, Interview, Revision and Progress pages |
| `sessions/sNN.js` | One file per session: modules, blocks, tasks and session-specific labs |
| `cases/*.js` | Self-paced interactive case studies |
| `tests/*.test.js` | `models.test.js` (simulation maths) and `content.test.js` (every block type, id, diagram edge and task link) |

### Adding content

A session module is a list of blocks: `{t:'<type>', ...}`. Diagram nodes use a compact grid syntax, `'id@col,row:Label|subtitle'`, and edges use `'a>b:label'` (`~>` dashed, `<>` both ways). Examples:

```js
{t:'predict', title:'What happens next?', scenario:'…', metrics:[['DB CPU','92%','bad']], q:'What first?',
 opts:[['Add a cache',1,'Why it works'], ['Shard now',0,'Why not yet']]}
{t:'scalelab', id:'s04scale', model:{readFrac:0.95, hitRate:0.9}, goal:10000, allow:['api','lb','cache','replicas']}
{t:'evolve', stages:[{label:'Day one', nodes:['client@0,1','api@1,1','db@2,1'], edges:['client>api','api>db'], problem:'…', fix:'…'}, …]}
```

Give a block an `id` and reference it from a session task with `auto:'<id>'` so the task ticks itself when the block is completed. Set `level:'f'|'i'|'x'` to override the default challenge level and `concept:'caching'` to feed concept mastery. Class modules in a session add up to 120 minutes.

## Tests

```bash
node tests/models.test.js
```

```bash
node tests/content.test.js
```
