# Mat-Trener — trener Alfika Matematycznego dla klasy IV

**Odbiorca:** zespół lub agent programistyczny wdrażający aplikację w repozytorium [TJetka/mat-trener](https://github.com/TJetka/mat-trener).  
**Wersja:** 1.1 · 6 listopada 2026 r. · **Język produktu i dokumentacji:** polski.

## 1. Cel i zakres pierwszej wersji

Czwartoklasista ma samodzielnie uruchomić test, rozwiązać go na telefonie, tablecie lub komputerze i sprawdzić swoje odpowiedzi względem oficjalnego klucza. Opiekun banku ma móc dołożyć kolejny rocznik z plików PDF bez edytowania kodu aplikacji. Wyniki dotyczą wyłącznie bieżącej próby. Aplikacja działa na GitHub Pages, bez kont, profili, serwera aplikacyjnego i historii między dniami.

**Pierwsze wydanie: Alfik Matematyczny, klasa IV szkoły podstawowej.** Uczeń od razu widzi trzy tryby Alfika. Pełny standardowy arkusz ma 30 zadań i trwa 75 minut. Zadania 1–10 są za 3 pkt, 11–20 za 4 pkt, a 21–30 za 5 pkt. Każde ma pięć odpowiedzi A–E, z których jedna jest poprawna. Klucze i zasady trzeba potwierdzić dla importowanej edycji. [Regulamin JERSZ, § 3 i § 8](https://jersz.pl/konkurs/alfik-matematyczny/) · [Arkusz klasy IV z 2025 r.](https://jersz.pl/wp-content/uploads/2025/11/AM-2025-4.pdf)

**Drugie wydanie: Kangur Matematyczny, kategoria Maluch (klasy III–IV).** Przygotować wspólny format danych i mechanizm oceniania już dla Alfika. Wybór konkursu na ekranie ucznia dodać dopiero po przygotowaniu banku Kangura. Każda próba korzysta z dokładnie jednego konkursu i jednej kategorii. Kolejność wdrożenia i warunek uruchomienia drugiego konkursu podano w § 7.

Pierwsza wersja obejmuje dwa produkty pracy: **zweryfikowany bank zadań w LaTeX-u** oraz **statyczną aplikację do rozwiązywania testów**. Import i korekta odbywają się poza przeglądarką ucznia. Generowanie nowych zadań, konta nauczycieli, rankingi i automatyczne wyjaśnienia rozwiązań są poza zakresem.

## 2. Trzy tryby pracy ucznia

| Tryb na ekranie startowym | Co wybiera uczeń | Skład i kolejność | Wynik |
|---|---|---|---|
| **Krótki trening** | Poziom: 3, 4 albo 5 pkt | Dokładnie 8 różnych zadań wybranego poziomu z puli roczników aktywnego konkursu i kategorii. Kolejność losowa. | Liczba poprawnych z 8 i zdobyte punkty treningowe. |
| **Miks** | Uruchomienie zestawu | Dokładnie 8 różnych zadań: 3 za 3 pkt, 3 za 4 pkt i 2 za 5 pkt. Losowanie w obrębie poziomów, potem wspólne tasowanie. | Liczba poprawnych z 8 i punkty treningowe z 31 możliwych. |
| **Pełny rocznik** | Rok z listy albo „Wylosuj rocznik” | Wszystkie zadania jednego kompletnego arkusza, w oficjalnej kolejności. Losowy może być wybór roku. Ponowne wskazanie tego samego roku odtwarza ten sam arkusz. | Liczba poprawnych i wynik zgodny z zasadami edycji, wraz z maksimum. |

**Przebieg próby.** Na ekranie startowym pokazać nazwę „Alfik Matematyczny · klasa IV”, liczbę pytań, czas i krótką regułę punktacji. Po naciśnięciu „Zacznij” pokazać jedno zadanie, np. „Zadanie 2 z 8”, jego wartość, zegar oraz odpowiedzi w oryginalnym porządku A–E. Kliknięcie odpowiedzi zapisuje wybór od razu. Uczeń może przejść dalej bez wyboru, wrócić, zmienić odpowiedź lub ją wyczyścić. Rysunek można powiększyć także wtedy, gdy sam stanowi wariant odpowiedzi.

**Zakończenie.** „Zakończ test” pokazuje liczbę pustych odpowiedzi i prosi o potwierdzenie. Po upływie czasu test kończy się automatycznie. Dopiero na ekranie wyniku pojawiają się poprawne odpowiedzi. Uczeń widzi osobno poprawne, błędne i pominięte zadania oraz może przejrzeć każde z nich z własnym wyborem, literą z oficjalnego klucza, rokiem i numerem źródłowym. Z wyniku może uruchomić nową próbę tego samego trybu albo wrócić do wyboru trybu.

**Dostępność.** Polskie etykiety i komunikaty, duże pola wyboru (min. 44 × 44 px), widoczny fokus i obsługa klawiaturą. Przy szerokości 360 px treść i warianty mieszczą się w jednej kolumnie. Odpowiedzi „poprawna”, „błędna” i „pominięta” mają etykiety tekstowe. Alternatywy tekstowe dla rysunków opisują dane z ilustracji i zachowują zagadkę.

## 3. Losowanie, czas i punktacja

### Losowanie nowej próby

- Losować w chwili rozpoczęcia nowej próby, również przy ponownym użyciu aplikacji tego samego dnia. Używać Web Crypto (`crypto.getRandomValues`), bez ziarna wyprowadzanego z daty, identyfikatora dziecka albo czasu budowania strony. Stosować tasowanie Fishera–Yatesa z równomiernym wyborem indeksu (odrzucanie nadmiarowych wartości przy mapowaniu zakresów).
- W treningu i miksie wybierać bez zwracania spośród opublikowanych zadań, aktywnych dla pary `id_konkursu` i `kategoria`, których lista klas obejmuje klasę IV. W pierwszym wydaniu para ta wskazuje Alfika i arkusz klasy IV. Pula obejmuje wyłącznie roczniki tej pary. W miksie każde zadanie ma równe szanse w obrębie swojej kategorii punktowej. W opcji „Wylosuj rocznik” każdy dostępny, kompletny rocznik ma równe szanse.
- Niezależne losowania mogą dać to samo zadanie lub nawet ten sam zestaw. Gdy pula poziomu liczy dokładnie 8 zadań, różnić może się wyłącznie kolejność. Nie zapisywać poprzednich prób, aby wymuszać zmianę. Odświeżenie aktywnego testu w tej samej karcie wznawia rozpoczętą próbę.
- Gdy dla poziomu brakuje 8 zadań lub miks nie spełnia któregokolwiek minimum 3/3/2, zablokować wyłącznie niedostępny wybór i pokazać przyczynę, np. „Na tym poziomie mamy 6 z 8 potrzebnych zadań”. Częściowy rocznik może zasilać treningi zweryfikowanymi zadaniami. Na liście pełnych roczników pojawia się dopiero po sprawdzeniu kompletności.

### Zegar

**Alfik, klasa IV.** Średnie tempo oficjalnego arkusza wynosi 2 min 30 s na zadanie (75 min / 30). Do treningów przyjmujemy szacunki: 1 min 30 s za zadanie 3-punktowe, 2 min 30 s za 4-punktowe i 3 min 30 s za 5-punktowe. Suma dla dziesięciu zadań każdego poziomu wynosi dokładnie 75 min. Limit dla krótkiego zestawu to suma budżetów wylosowanych zadań, bez osobnego limitu na pojedyncze pytanie. W pełnym roczniku obowiązuje czas zweryfikowany w źródle edycji. [Czas konkursu według JERSZ, § 3](https://jersz.pl/konkurs/alfik-matematyczny/)

| Zestaw | Budżet czasu | Maksimum punktów |
|---|---:|---:|
| 8 zadań za 3 pkt | 12 min | 24 |
| 8 zadań za 4 pkt | 20 min | 32 |
| 8 zadań za 5 pkt | 28 min | 40 |
| Miks 3/3/2 | 19 min | 31 |
| Pełny rocznik Alfika dla klasy IV | 75 min | 150 |

Odliczać czas do zapisanego momentu zakończenia. Przełączenie karty i odświeżenie nie zatrzymują zegara. W trakcie próby w `sessionStorage` tej karty zapisać wylosowany zestaw wraz z identyfikatorem konkursu i edycji każdego zadania, wersją reguł, treści i klucza, wybory, bieżący numer i termin końcowy. Wznowienie po terminie prowadzi od razu do wyniku. Przed zapisem odpowiedzi sprawdzać termin. Wygaśnięcie i ręczne zakończenie są obsługiwane tą samą operacją, która może zakończyć próbę tylko raz. Rozpoczęcie nowej próby zastępuje poprzednią.

### Punktacja

| Zdarzenie | Krótki trening i miks | Pełny rocznik Alfika, klasa IV |
|---|---:|---:|
| Początek | 0 pkt | 30 pkt |
| Poprawna odpowiedź | +wartość zadania | +wartość zadania |
| Błędna odpowiedź | 0 pkt | −¼ wartości zadania |
| Brak odpowiedzi | 0 pkt | 0 pkt |

Punkty treningowe nagradzają rozwiązane zadania. W pełnym roczniku przechowywać wynik w całkowitych ćwiartkach punktu, a w interfejsie stosować polski separator dziesiętny. Przykład: poprawna odpowiedź za 3 pkt, błędna za 5 pkt i 28 pustych dają **31,75 / 150 pkt** przy **1 / 30** poprawnych odpowiedziach. Maksimum wynika z 30 punktów początkowych i 120 punktów do zdobycia. [Zasady punktacji JERSZ, § 8](https://jersz.pl/konkurs/alfik-matematyczny/)

## 4. Bank zadań: od PDF-u do publikacji

### Format źródłowy i powiązanie z kluczem

Profil określa konkurs, kategorię, klasy, typ odpowiedzi, oczekiwany układ punktowy, punktację pełnego testu i budżety czasu treningowego. Edycja ma manifest z potwierdzonymi parametrami właściwego rocznika. Zadanie ma własny katalog, plik `zadanie.tex`, metadane i ewentualne rysunki. Warianty A–E są częścią transkrypcji. Z tych samych plików narzędzie buduje statyczny bank dla aplikacji. Korektę wprowadza się tylko w źródle. Nazwy poniższych pól stanowią kontrakt dla importera i walidatora.

| Obiekt | Wymagane dane |
|---|---|
| Edycja | `id_edycji`, `id_konkursu`, rok przeprowadzenia, opcjonalny rok szkolny, kategoria, `klasy`, wariant arkusza, oczekiwane numery i wartości punktowe, czas, reguła punktacji oraz źródło tych reguł. Dla Alfika klasy IV: `id_konkursu: alfik`, `kategoria: 4-sp`, `klasy: [4]`, numery 1–30. Przykładowe ID zadania: `alfik-2025-4-sp-pl-017`. |
| Dokument źródłowy | Stały identyfikator, rodzaj (arkusz, klucz lub errata), organizator, rok, wersja, URL lub nazwa dostarczonego pliku, SHA-256. Arkusz i klucz mogą stanowić różne strony tego samego pliku. |
| Zadanie | Stabilny `id` z identyfikatora edycji i numeru, `id_edycji`, `numer`, `punkty` ∈ {3, 4, 5}, odsyłacz do treści LaTeX, jedna grupa, jeden tag oraz stan weryfikacji. Rok, klasy i kategorię dziedziczy z edycji. |
| Pochodzenie treści i odpowiedzi | Identyfikator arkusza i strona lub strony zadania. Osobno litera poprawnej odpowiedzi, identyfikator oficjalnego klucza, strona i dokładna pozycja (np. „sekcja klasa 4P, pole 17”). Strony PDF liczone od 1. |
| Rysunki | Plik wewnątrz katalogu zadania, podpis alternatywny i miejsce w treści lub w konkretnej opcji. Rysunek i odpowiadająca mu litera pozostają powiązane przy każdym losowaniu. |

**Podzbiór LaTeX-u.** W `zadanie.tex` przyjąć UTF-8, jedno środowisko `tresc` i pięć środowisk `wariant` z argumentem A–E. Obsłużyć zwykły polski tekst, akapity, matematykę w `\(…\)` i `\[…\]` oraz lokalne rysunki, np. `\rysunek{plan.png}{Plan ogrodu z zaznaczonym wejściem}`. Parser rozróżnia tekst, wzory i rysunki. W interfejsie KaTeX składa wzory, a tekst i obrazy renderują osobne komponenty. Nierozpoznana konstrukcja kończy walidację błędem wskazującym plik i miejsce. Dostarczyć mały szablon LaTeX definiujący te środowiska i makro, aby opiekun mógł złożyć zadanie poza aplikacją.

Przykład autorski pokazuje tylko format pliku. Nie należy do historycznego banku.

~~~~tex
\begin{tresc}
Ola ma \(3\) pudełka. W każdym są \(4\) kredki.
Ile kredek ma Ola?
\end{tresc}
\begin{wariant}{A} \(7\)  \end{wariant}
\begin{wariant}{B} \(9\)  \end{wariant}
\begin{wariant}{C} \(12\) \end{wariant}
\begin{wariant}{D} \(16\) \end{wariant}
\begin{wariant}{E} \(24\) \end{wariant}
~~~~

### Praca opiekuna banku

1. **Zarejestruj źródła.** Przyjmij listę lokalnych PDF-ów lub adresów i przypisz role: arkusz, klucz, ewentualna errata. Porównaj konkurs, rok przeprowadzenia, klasę i wariant. Pierwszy import oprzeć na parze z 2025 r. JERSZ oznacza klucz jako „2025-26”. Z arkuszem z listopada 2025 r. łączy się sekcję „klasa 4P”. Sekcja „klasa 2,3,4L” jest przeznaczona dla liceum. [Arkusz 2025](https://jersz.pl/wp-content/uploads/2025/11/AM-2025-4.pdf) · [Oficjalny klucz 2025/26](https://jersz.pl/wp-content/uploads/2025/12/AM-2025-KLUCZ-POP.pdf)
2. **Przepisz zadania.** Dla PDF-u z warstwą tekstową zacznij od ekstrakcji, dla skanu od OCR. Podziel materiał według numerów i nagłówków punktowych. Zachowaj polskie znaki, jednostki, ułamki, kolejność A–E, podpisy, tabele i skalę rysunków. Przy zadaniach przestrzennych i odpowiedziach obrazkowych porównaj wszystkie warianty wizualnie ze stroną PDF. [Archiwum JERSZ](https://jersz.pl/konkurs/alfik-matematyczny/)
3. **Połącz z kluczem.** Łącz po konkursie, edycji, klasie, wariancie i numerze zadania. Zachowaj pozycję zaznaczonego pola klucza. W kluczu Alfika 2025 odpowiedzi są zaznaczone graficznie. Porównaj odczyt z obrazem strony, także gdy ekstrakcja tekstu zwraca wyłącznie nagłówki. Pusty wiersz w jednej kategorii nie może przesunąć odpowiedzi w sąsiedniej. Brak klucza, konflikt z erratą lub nieczytelny znak daje stan „do wyjaśnienia”. Nie uzupełniać litery przez samodzielne rozwiązanie. Jeśli organizator anulował zadanie, w pierwszej wersji wstrzymać ten rocznik w trybie pełnym do wdrożenia udokumentowanej reguły wyjątku.
4. **Pogrupuj i sprawdź.** Przypisz temat oraz tag zgodnie z § 5. Opiekun porównuje render zadania i każdą opcję ze stroną arkusza, sprawdza wskazaną komórkę klucza i zatwierdza rekord. Ponowny import identycznych plików nie tworzy duplikatów ani nie nadpisuje ręcznych poprawek. Zmieniony plik źródłowy lub errata tworzy propozycję aktualizacji i wymaga ponownej weryfikacji dotkniętych rekordów.
5. **Zbuduj bank do publikacji.** Walidator sprawdza unikatowość identyfikatorów, dozwolone punkty, komplet pięciu opcji, istnienie obu odsyłaczy źródłowych, poprawną literę, klasy, tagi, renderowanie wzorów i zasoby graficzne. Raport pokazuje dla każdego roku liczbę zadań oczekiwanych, zatwierdzonych i wyłączonych wraz z przyczyną. Błąd rekordu oznaczonego do publikacji przerywa budowę. Szkice są jawnie wyłączone.
6. **Oddziel materiały lokalne od publicznych.** Przy edycji odnotować, które treści i ilustracje właściciel projektu dopuścił do publicznego udostępnienia i na jakiej podstawie. Tylko takie zadania mogą trafić do publicznego repozytorium i pakietu strony. Surowe PDF-y domyślnie pozostają lokalne. Do prac programistycznych przed otrzymaniem materiałów użyć osobnych, autorskich danych testowych.

## 5. Grupowanie i jeden dodatkowy tag

Grupa odpowiada na pytanie **„Z jakiego obszaru jest to zadanie?”**, a tag na pytanie **„Co uczeń musi umieć zrobić, żeby je rozwiązać?”** Każde opublikowane zadanie ma dokładnie jedną grupę i jeden tag umiejętności, niezależnie od roku, klasy i punktów.

| Szeroka grupa | Przykładowy pojedynczy tag | Przykład decyzji |
|---|---|---|
| Liczby i działania | `reszta-z-dzielenia` | Kluczowym krokiem jest ustalenie, ile zostanie po podziale. |
| Geometria i wyobraźnia przestrzenna | `obrot-figury` | Trzeba rozpoznać figurę po obrocie. |
| Logika i zależności | `eliminacja-mozliwosci` | Kilka warunków pozwala wykluczać kolejne odpowiedzi. |
| Kombinatoryka i wzorce | `systematyczne-zliczanie` | Trzeba wypisać przypadki tak, aby żadnego nie powtórzyć. |
| Miary i dane | `odczyt-skali` | Wynik zależy od odczytu podziałki lub przeliczenia jednostek. |

**Procedura dla pierwszych roczników.** Zacząć od pięciu grup z tabeli. Opiekun lub skrypt proponuje przypisania dla każdego zadania, a następnie zestawia liczebności, przykłady graniczne i rozkład między rocznikami. Jeśli grupa rozrosła się wskutek przypisywania do niej wszystkiego, doprecyzować definicję i ponownie przejrzeć zadania. Przy remisie wybrać grupę opisującą rozstrzygający krok. Przykład: w zadaniu o prostokątach, które trzeba policzyć bez dwukrotnego uwzględnienia tych samych przypadków, właściwą grupą może być kombinatoryka. Sam rysunek nie rozstrzyga przypisania.

Słownik przechowywać w repozytorium wraz z polskimi nazwami i krótkimi definicjami. Tag można współdzielić między zadaniami. Nowy tag wymaga odróżnienia od istniejących. MVP dopuszcza ręczne grupowanie wspomagane propozycjami automatycznymi. Grupowanie odbywa się **przed publikacją**. Sposób losowania w trzech trybach nie zależy od liczebności grup.

## 6. Implementacja i GitHub Pages

**Proponowana konfiguracja startowa:** TypeScript i Vite dla strony, KaTeX dla wzorów, skrypty lokalne do importu i walidacji. Bank wynikowy w JSON. Podział plików: `dane/edycje/` (manifesty), `dane/zadania/` (LaTeX, metadane i ilustracje), `dane/slowniki/`, `narzedzia/`, `src/` oraz `.github/workflows/`. Jeśli repozytorium zawiera już aplikacje w chwili wdrożenia, włączyć trenera do istniejącego układu bez zastępowania ich strony startowej.

| Polecenie docelowe | Rezultat |
|---|---|
| `npm run importuj -- --manifest <plik>` | Tworzy lub aktualizuje lokalne szkice i raport różnic. Istniejące zatwierdzenia chronione zgodnie z § 4. |
| `npm run sprawdz:dane` | Sprawdza bank i generuje raport per rocznik. Kończy proces kodem błędu, gdy naruszono warunek publikacji. |
| `npm run dev` | Uruchamia lokalny podgląd ucznia. |
| `npm test` | Sprawdza import, kontrakt danych, losowanie, czas i wynik. |
| `npm run build` | Waliduje dane i buduje w `dist/` stronę razem z bankiem, rysunkami i fontami. |

**Wdrożenie.** W repozytorium ustawić źródło Pages na GitHub Actions i ścieżkę bazową Vite na `/mat-trener/`. Składanie na pull requestach obejmuje walidację, testy i budowę. Po udanym przebiegu na `main` opublikować tylko `dist/` przez oficjalne akcje Pages. Zadanie wdrażające otrzymuje uprawnienia `pages: write` i `id-token: write`. Użyć jednej strony bez tras wymagających przekierowań serwera. Docelowy adres to **https://tjetka.github.io/mat-trener/**. W próbie odbiorowej otworzyć ten adres bezpośrednio, rozwiązać zadanie z obrazkiem, odświeżyć stronę i dojść do wyniku. [Wdrożenie Vite](https://vite.dev/guide/static-deploy.html#github-pages) · [Oficjalna konfiguracja GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 7. Kolejność wdrożenia i kryteria odbioru

| Etap | Co oddaje agent | Warunek przejścia |
|---|---|---|
| 1. Alfik 2025, klasa IV | Manifest, importer, pliki LaTeX, klucz ze źródłami i podgląd. | Opiekun prześledzi drogę od wyświetlonego zadania do strony arkusza i konkretnej pozycji klucza. Przykład z odpowiedziami obrazkowymi renderuje się poprawnie. |
| 2. Alfik 2024 i bank wielu lat | Druga para źródeł, walidator, słowniki grup i tagów, raport kompletności. [Arkusz 2024](https://jersz.pl/wp-content/uploads/2024/11/4.pdf) · [Klucz 2024/25](https://jersz.pl/wp-content/uploads/2024/11/Klucz-ALFIK-2024.pdf) | Nowy rok dodaje się bez zmiany kodu strony. Pula treningowa może zawierać pytania spoza pełnych roczników. |
| 3. Trzy tryby | Ekrany wyboru, testu i wyniku, losowanie, czas oraz wznowienie. | Wszystkie poniższe scenariusze przechodzą automatycznie tam, gdzie wynik jest jednoznaczny. |
| 4. Publikacja | Działająca strona na Pages i krótka polska instrukcja dodawania kolejnego roku. | Test mobilny i próba pod docelowym adresem przechodzą. Publiczna premiera z historycznymi zadaniami wymaga co najmniej jednego kompletnego rocznika i zweryfikowanych zadań z kolejnego roku, aby trening faktycznie korzystał z kilku lat. |

### Scenariusze odbiorowe

| ID | Próba | Oczekiwany wynik |
|---|---|---|
| D1 | Wczytać ten sam manifest dwa razy. Następnie osobno podać klucz innego wariantu. | Identyczny import zachowuje identyfikatory i ręczne korekty. Błędny klucz blokuje zatwierdzenie. |
| D2 | Usunąć rysunek z odpowiedzi C albo usunąć odsyłacz do klucza. | Walidator wskazuje konkretny rekord. Uszkodzone zadanie nie pojawia się w opublikowanym banku. |
| D3 | Z pełnego rocznika usunąć jedno zadanie. | Rok znika z wyboru pełnego arkusza. Pozostałe zatwierdzone pozycje są dostępne do losowania. |
| D4 | Oznaczyć zadanie dwiema grupami, bez tagu lub tagiem spoza słownika. | Walidacja wskazuje błędne przypisanie i blokuje publikację rekordu. |
| D5 | Zaimportować rzeczywisty klucz Alfika 2025/26. | W sekcji „klasa 4P” zadania 1, 11, 21 i 30 mają odpowiednio C, A, D i C. To kontrola odczytu na granicach bloków. Przed publikacją opiekun porównuje wszystkie 30 liter z kluczem. |
| L1 | Uruchomić trening 4-punktowy oraz miks przy odpowiednio dużej puli. | Trening ma 8 różnych pytań za 4 pkt. Miks ma 8 różnych pytań w proporcjach 3/3/2. Kolejność A–E odpowiada arkuszowi. |
| L2 | W teście podstawić dwa ustalone strumienie liczb losowych przy tej samej dacie. Osobno sprawdzić wywołanie produkcyjnego źródła losowości przy każdym nowym starcie. | Dobrane strumienie dają oczekiwane różne zestawy. Test nie polega na przypadkowym warunku „dwa prawdziwe losowania muszą się różnić”. |
| L3 | Wybrać rok ręcznie i przez „Wylosuj rocznik”. | W obu przypadkach pełny arkusz jest kompletny, pochodzi z jednego roku i zachowuje oficjalną kolejność. |
| C1 | Odświeżyć test po 3 minutach, a następnie wrócić do karty po terminie. | Po odświeżeniu pozostają te same zadania i wybory oraz krótszy czas. Po terminie pokazuje się pojedynczy wynik. Dalsza edycja jest zablokowana. |
| W1 | W standardowym roczniku oddać wszystkie odpowiedzi kolejno jako poprawne, błędne albo puste w trzech osobnych próbach. | Dla Alfika klasy IV odpowiednio 150, 0 i 30 pkt. Przykład mieszany z § 3 daje 31,75 pkt. |
| W2 | W treningu za 4 pkt wybrać 5 poprawnych, 2 błędne i 1 pustą odpowiedź. | Wynik pokazuje 5/8 i 20/32 pkt. W przeglądzie można odróżnić błąd od pominięcia. |
| U1 | Na ekranie 360 px rozwiązać zadanie obrazkowe, cofnąć się, zmienić wybór i zakończyć próbę. | Rysunki dają się odczytać i powiększyć. Wynik uwzględnia ostatni wybór. Klucz widoczny jest po zakończeniu próby. |

### Drugie wydanie — Kangur Matematyczny

Po odbiorze Alfika dodać profil `kangur / maluch` dla klas III–IV i pierwszy kompletny rocznik ze zweryfikowanym kluczem. Wtedy ekran startowy umożliwia wybór konkursu. Te same trzy tryby korzystają z reguł i banku wybranego profilu. Dla standardowego Kangura Maluch pełny rocznik ma 24 zadania (po 8 z każdego poziomu), trwa 75 minut, daje 24 punkty początkowe i maksymalnie 120. Budżety krótkiego treningu wyznaczyć osobno dla tego profilu. [Regulamin Kangura, § 4–6](https://www.kangur-mat.pl/dokumenty/regulamin.pdf)

**Test rozdzielenia konkursów.** Dodać do danych testowych arkusze obu konkursów o tym samym roku i numerach pytań. Przy aktywnym Alfiku treningi, miks i lista lat korzystają wyłącznie z Alfika. Po przełączeniu na Kangura ekran korzysta wyłącznie z jego banku. Przy wszystkich odpowiedziach poprawnych wynik pełnego arkusza wynosi odpowiednio 150/150 lub 120/120. Ten test przygotować na danych autorskich już przy wdrażaniu profilu Alfika.

**Gotowość do rozpoczęcia prac.** Interfejs, importer i punktację można wdrażać na danych autorskich. Do odbioru banku historycznego potrzebne są rzeczywiste arkusze, pasujące oficjalne klucze i informacja, które materiały można publicznie udostępnić.
