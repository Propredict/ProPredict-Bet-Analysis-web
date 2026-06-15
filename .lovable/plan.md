## Cilj

Umesto da ujutro generišemo sve AI predikcije za ceo dan (pa rizikujemo da se menjaju), prelazimo na **per-match staggered generaciju**: svaka utakmica dobija svoju predikciju **tačno ~3h pre kickoff-a**, jednom zauvek. Do tada user vidi karticu sa "Prediction ready 3h before kickoff". Kad se generiše — push notifikacija: "🔮 Spain vs France prediction is ready".

## Korisnički tok

```text
08:00  User otvori app
       → vidi sve današnje mečeve
       → kartica: "⏳ Prediction unlocks at 15:00 (3h before kickoff)"
       → countdown timer
       → BEZ ikakvih brojeva/pickova

15:00  Cron okine za Spain vs France (kickoff 18:00)
       → generiše SAMO taj meč
       → upiše u ai_predictions (frozen=true)
       → pošalje push: "🔮 Spain vs France — AI Pick Ready!"

15:01  User otvori app → vidi pun pick, score, confidence
       → pick se NIKAD više ne menja (freeze guard)

18:00  Belgium meč i dalje "⏳ Unlocks at 18:00"
18:00  Cron okine za Belgium vs Italy (kickoff 21:00)
       → push: "🔮 Belgium vs Italy — AI Pick Ready!"
```

## Šta menjamo

### 1) Novi cron pristup — per-match scheduling

**Trenutno:** `generate-ai-predictions` se okida na fiksne sate (npr. svakih 4h) i obradi sve mečeve odjednom.

**Novo:** Jedan cron koji ide **svakih 15 minuta** i pita: "koje utakmice počinju za 2h45min–3h15min?" → generiše SAMO te.

Razlog 15-min prozor: garantuje da svaki meč bude pogođen jednom, nezavisno od kickoff vremena.

Edge function: `generate-ai-predictions` dobija novi režim `mode=due_only` koji:
- Učita fixtures sa kickoff-om u prozoru `now+2h45min` do `now+3h15min`
- Preskoči one koji već imaju `prediction` u `ai_predictions` (idempotentno)
- Generiše samo nove
- Za svaku novu predikciju pozove `send-push-notification` sa porukom "AI Pick Ready"

### 2) Freeze guard ostaje + pojačava se

`FREEZE GUARD` koji već postoji (utakmica LIVE/FT se ne dira) ostaje. Dodajemo:
- **FREEZE #3:** ako `ai_predictions` red već postoji za `match_id` → ne diraj. Tačka. Bez "corrective overwrite" logike.

### 3) UI — "Coming Soon" kartica

U `AIPredictions` listingu, za današnje mečeve **bez** predikcije:
- Pokaži karticu sa imenima timova, ligom, kickoff vremenom
- Umesto pick-a: gradient blur + ikona sat + tekst:
  > **🔒 AI Pick Unlocks at {kickoff - 3h}**
  > Our model uses final lineups & latest odds for max accuracy
- Mali live countdown ("Ready in 2h 14min")
- BEZ procenta, BEZ pick teksta, BEZ score-a — ništa što bi se kasnije moglo "promeniti"

Isto i u Dashboard hero "Today's AI Picks" sekciji.

### 4) Push notifikacija po predikciji

Nova svrha (`type: "ai_pick_ready"`) u `send-push-notification`:
- Naslov: `🔮 {Home} vs {Away} — AI Pick Ready`
- Telo: `{Confidence}% confidence — tap to view`
- `nav_path: /ai-predictions?match={id}`
- Šalje se SAMO korisnicima koji imaju push uključen (poštuje postojeću Notification Preference Integrity)
- 1 notifikacija po meču, nikad duplikat (čuva se flag u `ai_predictions.push_sent_at`)

Anti-spam: ako za isti sat ima 5+ mečeva, batch-uj u jednu poruku: "🔮 5 new AI Picks ready for tonight"

### 5) World Cup tretman

WC mečevi prate isti tok. Pošto WC ima par mečeva dnevno, i ovo eliminiše problem "ujutro jedan tip, popodne drugi".

## Šta NE menjamo

- Model (Poisson + xG + form + odds + injury_impact) ostaje isti
- Tier assignment (Premium/Pro/Free) ostaje
- Match Previews su nezavisan sistem (user-triggered, ne ovaj cron)

## Tehnički detalji

- **Migracija:** dodaj `push_sent_at TIMESTAMPTZ` na `ai_predictions`
- **Cron:** novi `pg_cron` job na 15 min koji POST-uje na `generate-ai-predictions?mode=due_only`
- **Stari cron:** ostavi 1 "safety net" run u 6 ujutro koji generiše predikcije za mečeve čiji je kickoff <3h od ponoći (early morning kickoffs)
- **Push:** novi template u `send-push-notification` za `ai_pick_ready`
- **UI:** novi komponent `<PendingPickCard>` koji prikazuje countdown umesto blur-ovanog pick-a

## Edge cases

| Slučaj | Rešenje |
|---|---|
| Kickoff <3h od sada (npr. zakasnili) | Generiši odmah pri sledećem cron tick-u |
| Cron miss (Supabase outage) | Safety net run u 6 ujutro hvata propušteno |
| Otkazana utakmica | Pre generacije proveri fixture status; PST/CANC → skip |
| User nema push uključen | Pick ipak postoji u app-u, samo bez notifikacije |
| Više od 10 mečeva u 15min prozoru | Batch push (1 zbirna notifikacija) |

## Pitanje pre nego što krenem

Da li je **3h pre kickoff-a** tvoja finalna odluka, ili da ide na **4h** (više vremena userima da pogledaju pre meča) ili **2h** (još preciznije, jer odds su čvršći)?

Moja preporuka: **3h** — najbolji balans (odds stabilni, lineups uskoro, dovoljno vremena za usera).