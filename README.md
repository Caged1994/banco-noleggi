# Banco Noleggi

Gestionale 2D di autonoleggio: parti il 1° gennaio con 4 auto e un piccolo ufficio e arrivi a un patrimonio di €100.000 servendo clienti, vendendo servizi, ispezionando i rientri e facendo crescere la flotta con le stagioni.

**Gioca:** https://caged1994.github.io/banco-noleggi/

Regole e numeri del gioco sono nel [documento di design](https://claude.ai/code/artifact/c80051be-6e7e-4624-8649-46adbeac38ea).

## Struttura

| Cartella | Cosa contiene |
| --- | --- |
| `src/data/` | Dati di gioco: categorie, clienti, servizi, listino danni, personale, banca |
| `src/core/` | Strumenti comuni: stato della partita, calendario, funzioni di utilità |
| `src/sim/` | Le regole del gioco, senza grafica: flotta, clienti, servizi, ispezioni, ritiri, banca, stagioni, chiusura della giornata |
| `src/ui/` | Le schermate: una funzione di disegno per ogni scheda e pannello |
| `src/app/` | Salvataggio e avvio |
| `src/main.ts` | Punto d'ingresso: collega i pulsanti alle azioni |
| `scripts/` | Build e simulazione automatica |

## Comandi

Serve Node.js 20 o successivo.

```
npm install          # installa TypeScript
npm run build        # crea dist/index.html, apribile direttamente nel browser
npm run simulate     # un bot gioca un anno e controlla che le regole reggano
npm test             # build + simulazione (lo stesso controllo della pubblicazione)
```

A ogni modifica del ramo `main`, GitHub Actions costruisce il gioco, esegue la simulazione e lo pubblica su GitHub Pages.
