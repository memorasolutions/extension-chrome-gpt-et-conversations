# 📦 Guide d'installation - ChatGPT Sync Manager

Ce guide vous accompagne étape par étape pour installer et configurer l'extension ChatGPT Sync Manager sur Google Chrome.

## 📋 Prérequis

- **Google Chrome** version 88 ou supérieure
- **Compte ChatGPT** actif (gratuit ou payant)
- **Accès à ChatGPT** via chat.openai.com ou chatgpt.com

## 🚀 Installation

### Étape 1 : Télécharger les fichiers

1. **Téléchargez tous les fichiers** de l'extension :
   - `manifest.json`
   - `popup.html`, `popup.css`, `popup.js`
   - `content.js`
   - `background.js`
   - `options.html`, `options.css`, `options.js`

2. **Créez un dossier** sur votre ordinateur (ex: `ChatGPT-Sync-Manager`)

3. **Placez tous les fichiers** dans ce dossier

### Étape 2 : Créer les icônes

Créez un sous-dossier `icons/` et ajoutez les icônes :

**Option A : Icônes simples (recommandé pour débuter)**
Créez 4 fichiers PNG simples avec un carré vert :
- `icon16.png` (16x16 pixels)
- `icon32.png` (32x32 pixels)  
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

**Option B : Utiliser le guide des icônes**
Suivez le fichier `icons_guide.txt` pour créer des icônes professionnelles.

### Étape 3 : Structure finale

Votre dossier doit ressembler à ceci :
```
ChatGPT-Sync-Manager/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── background.js
├── options.html
├── options.css
├── options.js
├── README.md
├── INSTALLATION.md
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Étape 4 : Installation dans Chrome

1. **Ouvrez Google Chrome**

2. **Accédez aux extensions** :
   - Tapez `chrome://extensions/` dans la barre d'adresse
   - OU Menu ⋮ → Plus d'outils → Extensions

3. **Activez le mode développeur** :
   - Cliquez sur le toggle "Mode développeur" en haut à droite

4. **Chargez l'extension** :
   - Cliquez sur "Charger l'extension non empaquetée"
   - Sélectionnez le dossier `ChatGPT-Sync-Manager`
   - Cliquez sur "Sélectionner le dossier"

5. **Vérification** :
   - L'extension apparaît dans la liste
   - Une icône apparaît dans la barre d'outils Chrome
   - Le statut indique "Activée"

## ⚙️ Configuration initiale

### Première synchronisation

1. **Ouvrez ChatGPT** dans un nouvel onglet
2. **Connectez-vous** à votre compte
3. **Cliquez sur l'icône** de l'extension dans la barre d'outils
4. **Cliquez sur "Synchroniser"** dans le popup
5. **Patientez** quelques secondes
6. **Vos GPTs apparaissent** ! 🎉

### Accéder aux paramètres

1. **Cliquez sur l'icône** de l'extension
2. **Cliquez sur l'icône ⚙️** en bas à droite
3. **La page de paramètres** s'ouvre automatiquement

### Configuration recommandée

Dans les paramètres, configurez :

**Général :**
- Thème : Selon votre préférence
- Notifications : Activées
- Langue : Français

**Synchronisation :**
- Synchronisation automatique : ✅ Activée
- Intervalle : 5 minutes
- Synchroniser les GPTs : ✅ Activée
- Synchroniser les conversations : ✅ Activée

## 🔧 Vérification du fonctionnement

### Test basique

1. **Ouvrez ChatGPT**
2. **Cliquez sur l'extension**
3. **Vérifiez** que l'interface se charge correctement
4. **Testez** la recherche dans l'onglet "Mes GPTs"
5. **Ajoutez** un GPT manuellement dans l'onglet "Ajouter"

### Test de synchronisation

1. **Créez un nouveau GPT** sur ChatGPT
2. **Attendez** 5 minutes (ou synchronisation manuelle)
3. **Vérifiez** qu'il apparaît dans l'extension
4. **Testez** l'ouverture en cliquant dessus

## 🐛 Résolution des problèmes

### L'extension ne s'installe pas

**Erreur manifeste :**
- Vérifiez que `manifest.json` est bien formaté
- Utilisez un validateur JSON en ligne
- Vérifiez que tous les fichiers sont présents

**Permissions refusées :**
- Redémarrez Chrome
- Essayez en mode incognito
- Vérifiez les paramètres de sécurité Chrome

### L'extension ne fonctionne pas

**Popup vide ou erreurs :**
```
1. Ouvrez la console développeur (F12)
2. Allez dans l'onglet "Extensions" 
3. Cliquez sur "Détails" de l'extension
4. Cliquez sur "Afficher les erreurs"
5. Partagez les erreurs pour diagnostic
```

**Synchronisation échoue :**
- Vérifiez que vous êtes connecté à ChatGPT
- Actualisez la page ChatGPT
- Désactivez/réactivez l'extension
- Vérifiez les permissions dans chrome://extensions/

### Performance lente

**Extension lente :**
- Réduisez l'intervalle de synchronisation
- Nettoyez les données anciennes
- Désactivez les notifications si non nécessaires

## 🔄 Mise à jour de l'extension

### Mise à jour manuelle

1. **Téléchargez** les nouveaux fichiers
2. **Remplacez** les anciens fichiers
3. **Rechargez** l'extension :
   - chrome://extensions/
   - Cliquez sur ⟲ (recharger) sur l'extension

### Sauvegarde avant mise à jour

1. **Exportez vos données** :
   - Paramètres → Données → Exporter
2. **Sauvegardez** le fichier JSON
3. **Procédez** à la mise à jour
4. **Réimportez** si nécessaire

## 📱 Utilisation mobile

L'extension fonctionne uniquement sur **Chrome Desktop**. 

Pour un accès mobile :
- Synchronisez sur desktop
- Exportez vos données
- Accédez manuellement à vos GPTs favoris

## 🔒 Confidentialité et sécurité

### Données stockées

- **Localement uniquement** : Aucune donnée n'est envoyée sur internet
- **Chrome Sync** : Optionnel, synchronisation avec votre compte Google
- **Pas de tracking** : Aucune analytics ou suivi

### Permissions accordées

L'extension demande accès à :
- **ChatGPT uniquement** : chat.openai.com et chatgpt.com
- **Stockage local** : Sauvegarde de vos préférences
- **Onglet actif** : Pour lire le contenu ChatGPT
- **Notifications** : Alerts de synchronisation

## 📞 Support

### Problème persistant ?

1. **Consultez** le README.md pour plus de détails
2. **Vérifiez** les issues GitHub connues
3. **Créez** une nouvelle issue avec :
   - Version de Chrome
   - Détails du problème
   - Messages d'erreur
   - Étapes pour reproduire

### Ressources utiles

- **Documentation** : README.md
- **Guide des icônes** : icons_guide.txt
- **Chrome Extensions** : https://developer.chrome.com/docs/extensions/
- **ChatGPT** : https://chat.openai.com/

## ✅ Checklist d'installation réussie

- [ ] Tous les fichiers téléchargés
- [ ] Dossier `icons/` créé avec 4 tailles
- [ ] Extension chargée dans Chrome
- [ ] Mode développeur activé
- [ ] Icône visible dans la barre d'outils
- [ ] Popup s'ouvre correctement
- [ ] Synchronisation avec ChatGPT réussie
- [ ] Paramètres configurés
- [ ] GPTs visibles dans l'extension

**🎉 Félicitations ! Votre ChatGPT Sync Manager est opérationnel !**

---

**💡 Astuce :** Épinglez l'extension dans la barre d'outils Chrome pour un accès rapide (cliquez sur l'icône de puzzle puis sur l'épingle à côté de l'extension).