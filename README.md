# System Design Interview Course (HLD + LLD)

A 40-hour, interactive, classroom-ready course for system design interviews: 20 sessions of 2 hours each, covering high-level design, low-level design and full mock interviews.

**Open the course:** https://rizwan3659.github.io/system-design-interview-course/

Everything runs in the browser. There is no build step and no backend.

## How each session runs

Every session is a 2-hour class with:

- a **class clock** that shows which module should be on screen
- short **concept modules** with clickable cards and quick quizzes
- a hands-on **lab**: architecture labs where you add parts and break things, plus simulators for caching, consistent hashing, quorums, queues, rate limiting, geo search, elevator scheduling, LRU caches and more
- a **guided interview problem** with think timers and model answers
- a **review**: flashcards, exit quiz, rubric and homework
- **teacher notes** at the end of each module

Progress, quiz answers and notes are saved in each student's own browser (localStorage). Nothing is sent anywhere.

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

| Path | What it is |
|---|---|
| `index.html` | Page shell and styles |
| `engine.js` | Renders sessions and all interactive blocks (quizzes, steppers, timers, architecture labs, UML diagrams, code blocks) |
| `sessions/sNN.js` | One file per session: modules, content and session-specific labs |

To add or edit a session, change its file in `sessions/`. Module durations in a session add up to 120 minutes.
