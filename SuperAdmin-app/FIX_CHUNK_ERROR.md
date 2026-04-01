# Solution pour l'erreur ChunkLoadError

## Erreur rencontrée
```
Loading chunk vendors-node_modules_reactstrap_es_Modal_js-node_modules_reactstrap_es_ModalBody_js failed.
ChunkLoadError
```

## Solutions à essayer (dans l'ordre)

### Solution 1 : Vider le cache du navigateur
1. Ouvrez les outils de développement (F12)
2. Clic droit sur le bouton de rechargement
3. Sélectionnez "Vider le cache et effectuer une actualisation forcée"
   - Ou utilisez Ctrl+Shift+R (Windows/Linux) ou Cmd+Shift+R (Mac)

### Solution 2 : Redémarrer le serveur de développement
1. Arrêtez le serveur (Ctrl+C dans le terminal)
2. Supprimez le dossier `.cache` ou `node_modules/.cache` si présent
3. Redémarrez le serveur :
   ```bash
   npm start
   # ou
   yarn start
   ```

### Solution 3 : Nettoyer le build et redémarrer
```bash
# Supprimer le dossier build
rm -rf build
# ou sur Windows PowerShell
Remove-Item -Recurse -Force build

# Supprimer le cache node_modules
rm -rf node_modules/.cache
# ou sur Windows PowerShell
Remove-Item -Recurse -Force node_modules\.cache

# Redémarrer le serveur
npm start
```

### Solution 4 : Réinstaller les dépendances (si les solutions précédentes ne fonctionnent pas)
```bash
# Supprimer node_modules et package-lock.json
rm -rf node_modules package-lock.json
# ou sur Windows PowerShell
Remove-Item -Recurse -Force node_modules, package-lock.json

# Réinstaller
npm install

# Redémarrer
npm start
```

### Solution 5 : Vérifier la configuration Webpack
Si le problème persiste, vérifiez que votre `package.json` contient bien `reactstrap` :
```bash
npm list reactstrap
```

## Solution rapide (recommandée)
1. **Fermez complètement le navigateur**
2. **Arrêtez le serveur de développement** (Ctrl+C)
3. **Supprimez le cache** :
   ```powershell
   Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
   ```
4. **Redémarrez le serveur** :
   ```bash
   npm start
   ```
5. **Ouvrez le navigateur en mode navigation privée** pour tester

## Note
Cette erreur est généralement causée par :
- Le cache du navigateur qui contient d'anciennes versions de chunks
- Le serveur de développement qui n'a pas rechargé correctement les modules
- Un problème de hot module replacement (HMR)

La solution la plus efficace est généralement de vider le cache et redémarrer le serveur.

