# Aether — Event edition / GitHub Pages

Estrai lo ZIP e carica tutti i contenuti nella radice del repository: `index.html`, gli altri file e tutta la cartella `assets`. Ogni file è inferiore a 25 MiB. Non caricare lo ZIP come unico file del sito.

In **Settings → Pages → Source** scegli **Deploy from a branch**, quindi `main` e `/ (root)`. Apri il link HTTPS indicato da GitHub e consenti la webcam.

Nessuna schermata introduttiva. Richiesta webcam all’apertura, video a tutta finestra e schermo intero al primo clic se richiesto dal browser. Menu hamburger a scomparsa. Due loghi originali dell’evento sempre visibili senza box. PIERONCI escluso. Tracking 1.2: riaggancio circa 320 ms, analisi corpo ridotta a 640 px, ritaglio mani della parte superiore del corpo e ricerca mirata di recupero attorno ai polsi. Selezione automatica del soggetto centrale; tocca un’altra persona per selezionarla. Contorno visibile e regolabile dal menu.

Due pizzichi e mani lontane creano una finestra; un pizzico la sposta o ridimensiona. Mano aperta sulla finestra e pugno per mezzo secondo la elimina. I gesti sono sospesi col menu aperto. I dati video non vengono caricati su un server.

Il modello rileva fino a 4 persone; occlusioni, incroci e poca luce possono ridurre l’affidabilità. Il test include una scena di 3 persone con entrambe le mani del soggetto centrale associate. Verifica sul posto prima dell’evento.

Per le app e l’HTML autonomo oltre 25 MiB, usa gli allegati di una GitHub Release. Per provare questo pacchetto in locale: `python3 -m http.server 4317`, poi http://localhost:4317.
