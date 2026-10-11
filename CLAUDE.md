# Banco Noleggi · istruzioni per lavorare sul progetto

Gestionale 2D di autonoleggio in TypeScript, senza framework né dipendenze a runtime. Il proprietario scrive in italiano: testi di gioco, commenti e messaggi di commit in italiano.

## Riferimenti
- Documento di design (regole e numeri): https://claude.ai/code/artifact/c80051be-6e7e-4624-8649-46adbeac38ea
- Gioco pubblicato: https://caged1994.github.io/banco-noleggi/
- Anteprima su claude.ai: si pubblica `build/artifact.html` (non `dist/index.html`, che ha già doctype e head).

## Comandi
- `node scripts/build.mjs`: compila con `tsc` e unisce i moduli in `dist/index.html` e `build/artifact.html`.
- `node scripts/simulate.mjs [giorni] [partite]`: un bot gioca e controlla le invarianti. Da eseguire dopo ogni modifica alle regole o ai numeri; riporta clienti al giorno, cassa, patrimonio e flotta.
- `tsc -p tsconfig.json --noEmit`: controllo dei tipi (deve restare a zero errori).

## Architettura
- `src/data/`: costanti e tabelle di gioco. Qui si bilancia.
- `src/core/state.ts`: `S` (partita) e `ui` (interfaccia) sono `let` esportati; si sostituiscono solo con `setState` / `setUi`, mai riassegnandoli.
- `src/sim/`: regole pure. Non toccano il DOM, salvo `ui.insMsg`/`ui.mktMsg` per gli esiti da mostrare.
- `src/ui/`: funzioni `render*` che scrivono HTML nei contenitori di `src/index.html`; `ui/render.ts` ridisegna tutto.
- `src/main.ts`: delega dei click/change tramite `data-a` e `data-id`/`data-k` sui pulsanti.
- Il build unisce i moduli in un unico script in ordine di dipendenza: ogni nome esportato deve essere unico in tutto il progetto, e nessun modulo deve eseguire codice al caricamento che usi valori di un altro modulo.
- Salvataggio in `localStorage` (`SAVE` in `data/catalog.ts`): quando cambia la forma dello stato, aggiornare il controllo in `app/save.ts` o la chiave.

## Regole di lavoro
- Ogni modifica: build, simulazione, poi una prova nel browser (Playwright è disponibile) prima del commit.
- Le regole nuove o cambiate vanno riportate anche nel documento di design.
- Le pagine devono funzionare a 400 px di larghezza e in tema chiaro e scuro (colori solo tramite variabili CSS).
