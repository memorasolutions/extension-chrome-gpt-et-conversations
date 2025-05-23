// Background Service Worker pour ChatGPT Sync Manager

class BackgroundManager {
  constructor() {
    this.contextMenuId = 'chatgpt-sync-menu';
    this.isInitialized = false;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    console.log('ChatGPT Sync Manager - Background script initialisé');
    
    // Gestion de l'installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    // Gestion des messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Garde la connexion ouverte pour les réponses asynchrones
    });

    // Gestion des onglets
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Gestion des raccourcis clavier
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
    });

    // Mise en place du menu contextuel
    this.setupContextMenu();

    // Nettoyage périodique
    this.setupPeriodicCleanup();
  }

  async handleInstall(details) {
    try {
      if (details.reason === 'install') {
        console.log('Première installation de l\'extension');
        
        // Initialisation des données par défaut
        await this.initializeDefaultData();
        
        // Ouverture de la page d'options pour la configuration
        chrome.tabs.create({
          url: chrome.runtime.getURL('options.html')
        });
        
        // Notification de bienvenue
        this.showNotification('welcome', {
          title: 'ChatGPT Sync Manager installé !',
          message: 'Cliquez sur l\'icône de l\'extension pour commencer à synchroniser vos GPTs.',
          iconUrl: 'icons/icon48.png'
        });
      } else if (details.reason === 'update') {
        console.log('Extension mise à jour');
        await this.handleUpdate(details.previousVersion);
      }
    } catch (error) {
      console.error('Erreur lors de l\'installation:', error);
    }
  }

  async initializeDefaultData() {
    const defaultSettings = {
      theme: 'light',
      autoSync: true,
      syncInterval: 5, // minutes
      notifications: true,
      categories: [
        'writing', 'coding', 'analysis', 'creative', 
        'business', 'education', 'other'
      ],
      lastSync: null,
      syncGPTs: true,
      syncConversations: true,
      primaryColor: '#10a37f',
      backgroundColor: '#ffffff'
    };

    const existingData = await chrome.storage.local.get(['settings', 'gpts', 'conversations', 'stats']);
    
    if (!existingData.settings) {
      await chrome.storage.local.set({
        settings: defaultSettings,
        gpts: existingData.gpts || [],
        conversations: existingData.conversations || [],
        stats: existingData.stats || {
          totalSyncs: 0,
          lastSyncDate: null,
          totalGPTs: 0,
          totalConversations: 0
        }
      });
    }
  }

  async handleUpdate(previousVersion) {
    try {
      // Migration des données si nécessaire
      const currentVersion = chrome.runtime.getManifest().version;
      console.log(`Mise à jour de ${previousVersion} vers ${currentVersion}`);
      
      // Ici, on pourrait ajouter des migrations de données
      await this.migrateData(previousVersion, currentVersion);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  }

  async migrateData(fromVersion, toVersion) {
    try {
      // Exemple de migration
      if (this.compareVersions(fromVersion, '1.0.0') < 0) {
        console.log('Migration vers v1.0.0');
        
        // Récupération des données existantes
        const data = await chrome.storage.local.get(['gpts', 'conversations', 'settings']);
        
        // Ajout de nouveaux champs aux GPTs existants
        if (data.gpts) {
          const migratedGPTs = data.gpts.map(gpt => ({
            ...gpt,
            usageCount: gpt.usageCount || 0,
            lastUsed: gpt.lastUsed || new Date().toISOString(),
            category: gpt.category || 'other'
          }));
          
          await chrome.storage.local.set({ gpts: migratedGPTs });
        }

        // Migration des paramètres
        if (data.settings) {
          const migratedSettings = {
            ...data.settings,
            syncGPTs: data.settings.syncGPTs !== false,
            syncConversations: data.settings.syncConversations !== false,
            primaryColor: data.settings.primaryColor || '#10a37f',
            backgroundColor: data.settings.backgroundColor || '#ffffff'
          };
          
          await chrome.storage.local.set({ settings: migratedSettings });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la migration:', error);
    }
  }

  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }
    
    return 0;
  }

  async handleMessage(request, sender, sendResponse) {
    console.log('Message reçu dans background:', request);

    try {
      switch (request.action) {
        case 'syncData':
          await this.performSync(request.data);
          sendResponse({ success: true });
          break;

        case 'getStats':
          const stats = await this.getStats();
          sendResponse({ success: true, stats });
          break;

        case 'updateSettings':
          await this.updateSettings(request.settings);
          sendResponse({ success: true });
          break;

        case 'exportData':
          const exportData = await this.exportAllData();
          sendResponse({ success: true, data: exportData });
          break;

        case 'showNotification':
          this.showNotification(request.id, request.options);
          sendResponse({ success: true });
          break;

        case 'performManualSync':
          const syncResult = await this.performManualSync();
          sendResponse(syncResult);
          break;

        default:
          sendResponse({ success: false, error: 'Action non reconnue' });
      }
    } catch (error) {
      console.error('Erreur dans handleMessage:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    try {
      // Vérifier si l'onglet est ChatGPT et complètement chargé
      if (changeInfo.status === 'complete' && 
          tab.url && 
          (tab.url.includes('chat.openai.com') || tab.url.includes('chatgpt.com'))) {
        
        console.log('Onglet ChatGPT détecté:', tab.url);
        
        // Auto-sync si activé
        const settings = await this.getStorageData('settings') || {};
        if (settings.autoSync) {
          setTimeout(() => {
            this.triggerAutoSync(tabId);
          }, 3000); // Attendre 3 secondes que la page soit bien chargée
        }

        // Mise à jour du badge
        this.updateExtensionBadge(tabId);
      }
    } catch (error) {
      console.error('Erreur dans handleTabUpdate:', error);
    }
  }

  async triggerAutoSync(tabId) {
    try {
      const lastSync = await this.getStorageData('lastAutoSync');
      const now = Date.now();
      const settings = await this.getStorageData('settings') || {};
      const syncInterval = (settings.syncInterval || 5) * 60 * 1000; // en ms

      // Vérifier si assez de temps s'est écoulé depuis le dernier sync
      if (!lastSync || (now - lastSync) > syncInterval) {
        console.log('Déclenchement de l\'auto-sync');
        
        // Vérifier que l'onglet existe encore
        try {
          await chrome.tabs.get(tabId);
        } catch (error) {
          console.log('Onglet fermé, annulation de l\'auto-sync');
          return;
        }

        // Injection du content script
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
          });

          // Synchronisation des GPTs
          let gptResult = null;
          if (settings.syncGPTs !== false) {
            try {
              gptResult = await chrome.tabs.sendMessage(tabId, { action: 'syncGPTs' });
              if (gptResult && gptResult.success && gptResult.gpts) {
                await chrome.storage.local.set({ gpts: gptResult.gpts });
              }
            } catch (error) {
              console.error('Erreur sync GPTs auto:', error);
            }
          }

          // Synchronisation des conversations
          let convResult = null;
          if (settings.syncConversations !== false) {
            try {
              convResult = await chrome.tabs.sendMessage(tabId, { action: 'syncConversations' });
              if (convResult && convResult.success && convResult.conversations) {
                await chrome.storage.local.set({ conversations: convResult.conversations });
              }
            } catch (error) {
              console.error('Erreur sync conversations auto:', error);
            }
          }

          // Enregistrement du sync
          await chrome.storage.local.set({ lastAutoSync: now });
          await this.recordSync();
          
          // Notification si activée
          if (settings.notifications) {
            const gptCount = gptResult?.gpts?.length || 0;
            const convCount = convResult?.conversations?.length || 0;
            
            this.showNotification('auto-sync', {
              title: 'Synchronisation automatique',
              message: `${gptCount} GPTs et ${convCount} conversations synchronisés`,
              iconUrl: 'icons/icon48.png'
            });
          }
        } catch (error) {
          console.error('Erreur injection content script:', error);
        }
      }
    } catch (error) {
      console.error('Erreur auto-sync:', error);
    }
  }

  async updateExtensionBadge(tabId) {
    try {
      const gpts = await this.getStorageData('gpts') || [];
      const badgeText = gpts.length > 0 ? gpts.length.toString() : '';
      
      chrome.action.setBadgeText({
        text: badgeText,
        tabId: tabId
      });
      
      chrome.action.setBadgeBackgroundColor({
        color: '#10a37f'
      });
    } catch (error) {
      console.error('Erreur mise à jour badge:', error);
    }
  }

  async handleCommand(command) {
    console.log('Commande reçue:', command);
    
    try {
      switch (command) {
        case 'sync-gpts':
          await this.syncFromActiveTab();
          break;
        case 'open-popup':
          // Ouvrir le popup (si possible)
          chrome.action.openPopup();
          break;
      }
    } catch (error) {
      console.error('Erreur commande:', error);
    }
  }

  async syncFromActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true,
        url: ['*://chat.openai.com/*', '*://chatgpt.com/*']
      });

      if (tabs.length > 0) {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        });

        const settings = await this.getStorageData('settings') || {};
        
        // Sync GPTs
        let gptResponse = null;
        if (settings.syncGPTs !== false) {
          gptResponse = await chrome.tabs.sendMessage(tabs[0].id, { action: 'syncGPTs' });
          if (gptResponse && gptResponse.success) {
            await chrome.storage.local.set({ gpts: gptResponse.gpts });
          }
        }

        // Sync Conversations
        let convResponse = null;
        if (settings.syncConversations !== false) {
          convResponse = await chrome.tabs.sendMessage(tabs[0].id, { action: 'syncConversations' });
          if (convResponse && convResponse.success) {
            await chrome.storage.local.set({ conversations: convResponse.conversations });
          }
        }

        if ((gptResponse && gptResponse.success) || (convResponse && convResponse.success)) {
          const gptCount = gptResponse?.gpts?.length || 0;
          const convCount = convResponse?.conversations?.length || 0;
          
          this.showNotification('manual-sync', {
            title: 'Synchronisation réussie',
            message: `${gptCount} GPTs et ${convCount} conversations synchronisés`,
            iconUrl: 'icons/icon48.png'
          });
          await this.recordSync();
        }
      } else {
        this.showNotification('sync-error', {
          title: 'Synchronisation impossible',
          message: 'Veuillez ouvrir ChatGPT dans un onglet',
          iconUrl: 'icons/icon48.png'
        });
      }
    } catch (error) {
      console.error('Erreur sync manuel:', error);
      this.showNotification('sync-error', {
        title: 'Erreur de synchronisation',
        message: error.message,
        iconUrl: 'icons/icon48.png'
      });
    }
  }

  async performManualSync() {
    try {
      const tabs = await chrome.tabs.query({
        url: ['*://chat.openai.com/*', '*://chatgpt.com/*']
      });
      
      if (tabs.length === 0) {
        return { success: false, error: 'Aucun onglet ChatGPT ouvert' };
      }

      // Injection du content script
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      });

      const settings = await this.getStorageData('settings') || {};
      let totalGPTs = 0;
      let totalConversations = 0;

      // Synchronisation conditionnelle
      if (settings.syncGPTs !== false) {
        const gptRes = await chrome.tabs.sendMessage(tabs[0].id, { action: 'syncGPTs' });
        if (gptRes && gptRes.success && gptRes.gpts) {
          await chrome.storage.local.set({ gpts: gptRes.gpts });
          totalGPTs = gptRes.gpts.length;
        }
      }

      if (settings.syncConversations !== false) {
        const convRes = await chrome.tabs.sendMessage(tabs[0].id, { action: 'syncConversations' });
        if (convRes && convRes.success && convRes.conversations) {
          await chrome.storage.local.set({ conversations: convRes.conversations });
          totalConversations = convRes.conversations.length;
        }
      }

      await this.recordSync();
      
      return { 
        success: true, 
        gptCount: totalGPTs, 
        conversationCount: totalConversations 
      };
    } catch (error) {
      console.error('Erreur sync manuel background:', error);
      return { success: false, error: error.message };
    }
  }

  setupContextMenu() {
    try {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: this.contextMenuId,
          title: 'Synchroniser avec ChatGPT Sync Manager',
          contexts: ['page'],
          documentUrlPatterns: [
            '*://chat.openai.com/*',
            '*://chatgpt.com/*'
          ]
        });

        chrome.contextMenus.create({
          id: 'add-gpt-context',
          title: 'Ajouter ce GPT à mes favoris',
          contexts: ['link'],
          targetUrlPatterns: [
            '*://chat.openai.com/g/*',
            '*://chatgpt.com/g/*'
          ]
        });
      });

      chrome.contextMenus.onClicked.addListener((info, tab) => {
        this.handleContextMenuClick(info, tab);
      });
    } catch (error) {
      console.error('Erreur setup context menu:', error);
    }
  }

  async handleContextMenuClick(info, tab) {
    try {
      if (info.menuItemId === this.contextMenuId) {
        // Synchronisation depuis le menu contextuel
        await this.syncFromActiveTab();
      } else if (info.menuItemId === 'add-gpt-context') {
        // Ajout rapide d'un GPT depuis un lien
        await this.addGPTFromUrl(info.linkUrl, tab);
      }
    } catch (error) {
      console.error('Erreur context menu click:', error);
    }
  }

  async addGPTFromUrl(url, tab) {
    try {
      // Extraction des informations depuis l'URL
      const urlMatch = url.match(/\/g\/([^/?]+)/);
      if (!urlMatch) return;

      const gptId = urlMatch[1];
      
      // Vérifier si le GPT existe déjà
      const existingGPTs = await this.getStorageData('gpts') || [];
      if (existingGPTs.find(g => g.url === url)) {
        this.showNotification('gpt-exists', {
          title: 'GPT déjà ajouté',
          message: 'Ce GPT est déjà dans votre collection',
          iconUrl: 'icons/icon48.png'
        });
        return;
      }

      // Essayer d'obtenir le titre de la page
      let name = 'GPT Ajouté';
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentPageTitle' });
        if (response && response.title) {
          name = response.title.replace(' | ChatGPT', '').trim();
        }
      } catch (error) {
        console.warn('Impossible d\'obtenir le titre de la page');
      }

      // Création du GPT
      const newGPT = {
        id: gptId,
        name: name,
        description: 'Ajouté depuis le menu contextuel',
        url: url,
        category: 'other',
        favorite: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        source: 'context-menu'
      };

      // Sauvegarde
      existingGPTs.push(newGPT);
      await chrome.storage.local.set({ gpts: existingGPTs });

      this.showNotification('gpt-added', {
        title: 'GPT ajouté !',
        message: `${name} a été ajouté à votre collection`,
        iconUrl: 'icons/icon48.png'
      });
    } catch (error) {
      console.error('Erreur ajout GPT depuis URL:', error);
    }
  }

  setupPeriodicCleanup() {
    // Nettoyage toutes les 24h
    setInterval(() => {
      this.performCleanup();
    }, 24 * 60 * 60 * 1000);

    // Nettoyage initial après 5 minutes
    setTimeout(() => {
      this.performCleanup();
    }, 5 * 60 * 1000);
  }

  async performCleanup() {
    try {
      console.log('Nettoyage périodique des données');
      
      // Nettoyage des doublons
      await this.removeDuplicates();
      
      // Mise à jour des statistiques
      await this.updateStats();
      
      // Nettoyage des notifications anciennes
      chrome.notifications.getAll((notifications) => {
        Object.keys(notifications).forEach(id => {
          chrome.notifications.clear(id);
        });
      });
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  }

  async removeDuplicates() {
    try {
      const gpts = await this.getStorageData('gpts') || [];
      const conversations = await this.getStorageData('conversations') || [];

      // Déduplication des GPTs
      const uniqueGPTs = gpts.filter((gpt, index, self) => 
        index === self.findIndex(g => g.url === gpt.url || g.id === gpt.id)
      );

      // Déduplication des conversations
      const uniqueConversations = conversations.filter((conv, index, self) => 
        index === self.findIndex(c => c.url === conv.url || c.id === conv.id)
      );

      if (uniqueGPTs.length !== gpts.length || uniqueConversations.length !== conversations.length) {
        await chrome.storage.local.set({
          gpts: uniqueGPTs,
          conversations: uniqueConversations
        });
        console.log(`Dédoublonnage: ${gpts.length - uniqueGPTs.length} GPTs et ${conversations.length - uniqueConversations.length} conversations supprimés`);
      }
    } catch (error) {
      console.error('Erreur déduplication:', error);
    }
  }

  async updateStats() {
    try {
      const gpts = await this.getStorageData('gpts') || [];
      const conversations = await this.getStorageData('conversations') || [];
      const currentStats = await this.getStorageData('stats') || {};

      const newStats = {
        ...currentStats,
        totalGPTs: gpts.length,
        totalConversations: conversations.length,
        lastUpdateDate: new Date().toISOString(),
        categoryBreakdown: this.getCategoryBreakdown(gpts),
        usageStats: this.getUsageStats(gpts)
      };

      await chrome.storage.local.set({ stats: newStats });
    } catch (error) {
      console.error('Erreur mise à jour stats:', error);
    }
  }

  async recordSync() {
    try {
      const stats = await this.getStorageData('stats') || {};
      const updated = {
        ...stats,
        totalSyncs: (stats.totalSyncs || 0) + 1,
        lastSyncTime: Date.now()
      };
      await chrome.storage.local.set({ stats: updated });
    } catch (error) {
      console.error('Erreur record sync:', error);
    }
  }

  getCategoryBreakdown(gpts) {
    const breakdown = {};
    gpts.forEach(gpt => {
      breakdown[gpt.category] = (breakdown[gpt.category] || 0) + 1;
    });
    return breakdown;
  }

  getUsageStats(gpts) {
    const totalUsage = gpts.reduce((sum, gpt) => sum + (gpt.usageCount || 0), 0);
    const mostUsed = gpts.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0];
    
    return {
      totalUsage,
      averageUsage: gpts.length > 0 ? totalUsage / gpts.length : 0,
      mostUsedGPT: mostUsed ? { name: mostUsed.name, count: mostUsed.usageCount } : null
    };
  }

  async getStats() {
    return await this.getStorageData('stats') || {};
  }

  async exportAllData() {
    try {
      const data = await chrome.storage.local.get(null);
      return {
        ...data,
        exportDate: new Date().toISOString(),
        version: chrome.runtime.getManifest().version
      };
    } catch (error) {
      console.error('Erreur export data:', error);
      return null;
    }
  }

  async updateSettings(newSettings) {
    try {
      const currentSettings = await this.getStorageData('settings') || {};
      const mergedSettings = { ...currentSettings, ...newSettings };
      await chrome.storage.local.set({ settings: mergedSettings });
    } catch (error) {
      console.error('Erreur update settings:', error);
    }
  }

  showNotification(id, options) {
    // Vérifier si les notifications sont activées
    this.getStorageData('settings').then(settings => {
      if (settings && settings.notifications !== false) {
        chrome.notifications.create(id, {
          type: 'basic',
          ...options
        });
      }
    }).catch(error => {
      console.error('Erreur notification:', error);
    });
  }

  async getStorageData(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key];
    } catch (error) {
      console.error('Erreur get storage:', error);
      return null;
    }
  }
}

// Initialisation du gestionnaire
const backgroundManager = new BackgroundManager();