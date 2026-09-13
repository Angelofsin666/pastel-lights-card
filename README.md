# Pastel Lights Card

Custom Lovelace card per Home Assistant per il controllo delle luci, in stile
pastello coerente con le card clima/tapparelle della stessa dashboard.

## Funzionalità

- Box riepilogo con illustrazione SVG di una lampadina, conteggio "X/Y luci
  accese" e barra di progresso percentuale.
- Header cliccabile: tocca tutto il titolo per accendere/spegnere **tutte**
  le luci della card in un colpo.
- Righe entità comode e cliccabili:
  - **click breve** → toggle on/off della singola luce
  - **click lungo (~0.5s)** → apre il popup "more-info" nativo di Home
    Assistant per quell'entità
  - se la luce è **dimmerabile** e accesa, sotto la riga compare uno slider
    di luminosità trascinabile
- Colore della card **personalizzabile** tramite editor visuale (8 colori
  pastello predefiniti), così puoi riusare la stessa card per ogni stanza
  cambiando solo il colore.

## Installazione

### Tramite HACS (consigliato)
1. HACS → Frontend → menu (⋮) in alto a destra → **Repository personalizzati**
2. Aggiungi l'URL del tuo repository GitHub, categoria "Lovelace"
3. Cerca "Pastel Lights Card" e installala
4. Riavvia/ricarica la cache del browser se necessario

### Manuale
1. Copia `pastel-lights-card.js` in `config/www/`
2. Aggiungi la risorsa in **Impostazioni → Dashboard → Risorse**:
   - URL: `/local/pastel-lights-card.js`
   - Tipo: **JavaScript Module** ⚠️ importante: deve essere caricata come
     modulo ES (`type: module`), perché il file usa `import` dinamici a
     livello principale per caricare LitElement da CDN.

## Configurazione (YAML)

```yaml
type: custom:pastel-lights-card
title: Esterni
subtitle: Luci esterne
icon: mdi:outdoor-lamp
color: amber
show_progress_bar: true
entities:
  - entity: light.luce_fronte_casa
    name: Fronte Casa
  - entity: light.luce_fronte_gatti
    name: Fronte L. Ovest
  - light.luce_discesa
  - light.luce_basculante
  - light.luce_lampioncino
  - light.luce_lato_ovest
```

Puoi anche configurarla interamente dall'editor visuale: aggiungi la card
dalla dashboard, scegli "Pastel Lights Card", e usa il form per titolo,
icona, entità e colore.

### Colori disponibili
`amber` · `blue` · `green` · `pink` · `purple` · `red` · `teal` · `orange`

## Note tecniche

- La card carica `lit-element` e `lit-html` da CDN (unpkg) al posto di
  riutilizzare l'istanza interna di Home Assistant: è l'approccio più
  stabile nel tempo rispetto agli hack che leggono le classi interne di HA
  (che possono rompersi ad ogni aggiornamento). Richiede una connessione
  internet attiva sul dispositivo che carica la dashboard la prima volta
  (poi resta in cache del browser).
- Il toggle "tutte le luci" usa il servizio `homeassistant.turn_on` /
  `homeassistant.turn_off`, compatibile con qualsiasi dominio `light.*`.
- Il rilevamento "dimmerabile" si basa sull'attributo
  `supported_color_modes` dell'entità (standard HA per le luci moderne).

## Interazioni touch e accessibilità

- Lo scorrimento annulla il tocco e la pressione prolungata: il popup si apre
  solo mantenendo il dito fermo per circa mezzo secondo. Anche l'annullamento
  del gesto da parte del browser interrompe la pressione.
- Il titolo mantiene il comando per tutte le luci, con la stessa protezione
  dagli scorrimenti accidentali.
- Sopra lo slider si può scorrere verticalmente; trascinando orizzontalmente
  si vede l'anteprima della luminosità, inviata alla luce una sola volta al
  rilascio. Un gesto annullato non invia comandi.
- Da tastiera: Tab seleziona i controlli, Invio/Spazio attiva le righe o il
  titolo; le frecce regolano lo slider di 5 punti, Home/End impostano 1/100%.
- Il ritocco grafico mantiene gli otto colori: icona del titolo su fondo
  pastello, stati in piccoli badge, ombre più leggere e slider più facile
  da toccare. Non richiede modifiche alla configurazione YAML.

### Verifica per lo sviluppo

Esegui `node --test tests/gestures.test.cjs` per le regressioni dei gesti.
I test usano servizi Home Assistant simulati; prima del rilascio verifica
lo scroll e la pressione lunga anche su un dispositivo touch reale.
