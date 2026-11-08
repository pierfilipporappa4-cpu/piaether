# Aether — GitHub Pages

## Pubblicazione dal browser

1. Estrai lo ZIP sul computer.
2. Nel repository GitHub scegli **Add file → Upload files**.
3. Trascina tutti i file e la cartella `assets` contenuti in questa cartella, mantenendo i percorsi. `index.html` deve apparire direttamente nella pagina principale del repository.
4. Conferma con **Commit changes**.
5. Vai in **Settings → Pages**. In **Source** scegli **Deploy from a branch**, poi **main** e **/ (root)**, quindi **Save**.
6. Attendi la pubblicazione e apri il link HTTPS indicato da GitHub Pages. Consenti la videocamera quando il browser lo richiede.

Non caricare lo ZIP come unico file del sito: estrailo e carica i suoi contenuti. Ogni file è inferiore a 25 MiB; il più grande è circa 9,2 MiB.

Il sito richiede subito la webcam, mostra il video a tutta finestra e tenta lo schermo intero (se il browser richiede un gesto, entra al primo clic). Menu hamburger a scomparsa, tracking mani, finestre tramite pizzico ed eliminazione a pugno sono inclusi.

Questa versione ha i modelli separati. Non spostare o rinominare la cartella `assets`. Per provare in locale usa un server HTTP, ad esempio `python3 -m http.server 4317`, poi apri `http://localhost:4317`.

## Distribuire le app e l’HTML autonomo

Per Aether.app in ZIP, l’EXE Windows e l’HTML autonomo oltre 25 MiB, usa **Releases → Draft a new release** nel repository e allega i file come asset della release. Non occorre inserirli nel codice del repository. Ogni asset di una release può essere inferiore a 2 GiB.

Il caricamento nel repository e l’eventuale pubblicazione rendono i file accessibili secondo le impostazioni del repository e di Pages che scegli tu.
