# ChatGPT Sync Manager 🚀

Une extension Chrome moderne et puissante pour synchroniser, organiser et gérer vos GPTs personnalisés et conversations ChatGPT avec style.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-orange.svg)

## ✨ Fonctionnalités principales

### 🔄 Synchronisation intelligente
- **Synchronisation automatique** de vos GPTs personnalisés
- **Détection automatique** lors de l'ouverture de ChatGPT
- **Synchronisation des conversations** avec historique
- **Intervalle personnalisable** (1 minute à 1 heure)

### 📱 Interface moderne
- **Design au goût du jour** avec animations fluides
- **Thème sombre/clair** automatique ou manuel
- **Interface responsive** adaptée à tous les écrans
- **Navigation intuitive** par onglets

### 🗂️ Organisation avancée
- **Catégorisation automatique** des GPTs
- **Système de favoris** et d'étoiles
- **Recherche instantanée** dans vos GPTs et conversations
- **Filtrage par catégorie** et date

### 📊 Statistiques détaillées
- **Graphiques d'utilisation** par catégorie
- **Statistiques de synchronisation**
- **Suivi des GPTs les plus utilisés**
- **Analyse des conversations actives**

### 💾 Gestion des données
- **Export/Import** complet de vos données
- **Sauvegarde automatique** dans le cloud Chrome
- **Nettoyage des doublons** intelligent
- **Suppression des anciennes données**

## 🛠️ Installation

### Installation manuelle (Développement)

1. **Téléchargez les fichiers** de l'extension
2. **Ouvrez Chrome** et allez à `chrome://extensions/`
3. **Activez le mode développeur** (toggle en haut à droite)
4. **Cliquez sur "Charger l'extension décompressée"**
5. **Sélectionnez le dossier** contenant les fichiers de l'extension
6. **L'extension est installée** ! 🎉

### Structure des fichiers

```
chatgpt-sync-manager/
├── manifest.json          # Configuration de l'extension
├── popup.html             # Interface principale
├── popup.css              # Styles de l'interface
├── popup.js               # Logique de l'interface
├── content.js             # Script d'extraction ChatGPT
├── background.js          # Service worker
├── options.html           # Page de paramètres
├── options.css            # Styles des paramètres
├── options.js             # Logique des paramètres
├── icons/                 # Icônes de l'extension
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # Ce fichier
```

## 🚀 Utilisation

### Première utilisation

1. **Ouvrez ChatGPT** dans un onglet Chrome
2. **Cliquez sur l'icône** de l'extension dans la barre d'outils
3. **Cliquez sur "Synchroniser"** pour importer vos GPTs
4. **Vos GPTs apparaissent** automatiquement organisés !

### Navigation

- **Onglet "Mes GPTs"** : Visualisez et gérez vos GPTs
- **Onglet "Conversations"** : Accédez à votre historique
- **Onglet "Ajouter"** : Ajoutez manuellement des GPTs

### Fonctionnalités avancées

#### Raccourcis clavier
- `Ctrl+Shift+S` : Synchronisation rapide
- Configurables dans `chrome://extensions/shortcuts`

#### Menu contextuel
- Clic droit sur ChatGPT → "Synchroniser avec ChatGPT Sync Manager"
- Clic droit sur un lien GPT → "Ajouter ce GPT à mes favoris"

#### Paramètres
- Accédez aux paramètres via l'icône ⚙️ dans l'extension
- Configurez la synchronisation automatique
- Personnalisez les catégories
- Gérez vos données

## 🎨 Personnalisation

### Thèmes
- **Clair** : Interface moderne et claire
- **Sombre** : Parfait pour les sessions nocturnes
- **Automatique** : S'adapte à votre système

### Catégories personnalisées
1. Allez dans **Paramètres → Catégories**
2. **Ajoutez vos propres catégories**
3. **Organisez vos GPTs** selon vos besoins

### Notifications
- Personnalisez les notifications de synchronisation
- Activez/désactivez les sons
- Contrôlez la fréquence

## 🔧 Configuration avancée

### Synchronisation automatique
```javascript
// Configuration recommandée
{
  "autoSync": true,
  "syncInterval": 5,        // 5 minutes
  "notifications": true,
  "syncGPTs": true,
  "syncConversations": true
}
```

### Catégories par défaut
- **Writing** (Écriture) : GPTs d'aide à la rédaction
- **Coding** (Programmation) : Assistants de développement
- **Analysis** (Analyse) : Outils d'analyse de données
- **Creative** (Créatif) : GPTs créatifs et artistiques
- **Business** (Business) : Outils professionnels
- **Education** (Éducation) : GPTs éducatifs
- **Other** (Autre) : Divers

## 📊 Statistiques et rapports

L'extension fournit des statistiques détaillées :

- **Nombre total de GPTs** synchronisés
- **Fréquence d'utilisation** par GPT
- **Répartition par catégories**
- **Historique des synchronisations**
- **Conversations actives** (dernière semaine)

## 🔒 Confidentialité et sécurité

- **Stockage local uniquement** : Vos données restent sur votre machine
- **Pas de serveur externe** : Aucune donnée n'est envoyée ailleurs
- **Code open source** : Transparence totale
- **Permissions minimales** : Accès uniquement à ChatGPT

### Permissions utilisées
- `storage` : Sauvegarde locale de vos données
- `activeTab` : Interaction avec l'onglet ChatGPT actif
- `scripting` : Injection du script d'extraction
- `notifications` : Notifications de synchronisation
- `contextMenus` : Menu contextuel

## 🐛 Dépannage

### L'extension ne synchronise pas
1. **Vérifiez** que vous êtes bien connecté à ChatGPT
2. **Actualisez** la page ChatGPT
3. **Réessayez** la synchronisation manuelle
4. **Vérifiez** les paramètres de synchronisation

### Les GPTs n'apparaissent pas
1. **Attendez** quelques secondes après la synchronisation
2. **Videz** les filtres de recherche
3. **Vérifiez** que la catégorie "Tous" est sélectionnée
4. **Réinitialisez** les données de sync si nécessaire

### Interface qui ne se charge pas
1. **Désactivez/réactivez** l'extension
2. **Rechargez** l'extension dans chrome://extensions/
3. **Vérifiez** qu'il n'y a pas d'erreurs dans la console

## 🤝 Contribution

Les contributions sont les bienvenues ! 

### Comment contribuer
1. **Fork** le projet
2. **Créez** une branche pour votre fonctionnalité
3. **Committez** vos changements
4. **Poussez** vers la branche
5. **Ouvrez** une Pull Request

### Développement local
```bash
# Clonez le repository
git clone https://github.com/votre-username/chatgpt-sync-manager.git

# Chargez l'extension en mode développeur
# Chrome → Extensions → Mode développeur → Charger l'extension décompressée
```

## 📝 Changelog

### Version 1.0.0 (2025)
- 🎉 **Version initiale**
- ✅ Synchronisation des GPTs et conversations
- ✅ Interface moderne avec thèmes
- ✅ Système de catégories
- ✅ Statistiques d'utilisation
- ✅ Export/Import des données
- ✅ Synchronisation automatique

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙋‍♂️ Support

- **Issues GitHub** : Pour les bugs et demandes de fonctionnalités
- **Email** : support@chatgpt-sync-manager.com
- **Documentation** : [Wiki du projet](https://github.com/votre-username/chatgpt-sync-manager/wiki)

## 🌟 Remerciements

- **OpenAI** pour ChatGPT
- **Google** pour l'API Chrome Extensions
- **La communauté** pour les retours et suggestions

---

**⭐ Si cette extension vous est utile, n'hésitez pas à lui donner une étoile sur GitHub !**

Made with ❤️ by [Votre Nom]