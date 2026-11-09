# R744 CoolProp WebAssembly voor GitHub Pages

## Vereiste CoolProp-bestanden
Plaats de officiele bestanden `coolprop.js` en `coolprop.wasm` in deze map. Download beide uit:
https://sourceforge.net/projects/coolprop/files/CoolProp/8.0.0/Javascript/

De bestanden zijn groot en zijn daarom niet in dit pakket opgenomen.

## Publiceren
1. Upload alle bestanden naar de hoofdmap van een GitHub-repository.
2. Controleer dat `index.html`, `app.js`, `style.css`, `coolprop.js` en `coolprop.wasm` naast elkaar staan.
3. Open Settings > Pages.
4. Kies Deploy from a branch, `main`, map `/root`.
5. Wacht op de GitHub Pages-workflow en open de gepubliceerde URL.

GitHub Pages levert `.wasm` normaal met MIME-type `application/wasm`. Open de site niet rechtstreeks via `file://`.
