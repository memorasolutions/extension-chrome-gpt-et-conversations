// Options Page Script pour ChatGPT Sync Manager

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

class OptionsManager {
  constructor() {
    this.currentSection = 'general';
    this.settings = {};
    this.data = {};
    this.init();
  }

  async init() {
    console.log('Options Manager initialisé');
    
    // Chargement des données
    await this.loadData();
    
    // Configuration des événements
    this.setupNavigation();
    this.setupSettingsHandlers();
    this.setupDataHandlers();
    this.setupCategoriesManager();
    
    // Chargement initial de l'interface
    this.loadSettings();
    this.updateDataSummary();
    this.updateStats();
    this.loadCategories();
    this.renderGptList();
    this.renderConvList();
    
    // Mise à jour de la version
    this.updateVersion();
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get(null);
      this.settings = result.settings || this.getDefaultSettings();
      this.data = {
        gpts: result.gpts || [],
        conversations: result.conversations || [],
        stats: result.stats || {}
      };
      console.log('Données chargées:', this.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.showToast('Erreur lors du chargement des paramètres', 'error');
    }
  }

  getDefaultSettings() {
    return {
      theme: 'light',
      language: 'fr',
      notifications: true,
      soundNotifications: false,
      autoSync: true,
      syncInterval: 5,
      syncGPTs: true,
      syncConversations: true,
      primaryColor: '#10a37f',
      backgroundColor: '#ffffff',
      categories: [
        'writing', 'coding', 'analysis', 'creative',
        'business', 'education', 'other'
      ]
    };
  }

  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.switchSection(section);
      });
    });
  }

  switchSection(sectionId) {
    // Mise à jour de la navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionId);
    });

    // Mise à jour du contenu
    document.querySelectorAll('.section').forEach(section => {
      section.classList.toggle('active', section.id === sectionId);
    });

    this.currentSection = sectionId;

    // Actions spécifiques par section
    if (sectionId === 'stats') {
      this.renderChart();
    }
  }

  setupSettingsHandlers() {
    // Thème
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.updateSetting('theme', e.target.value);
        this.applyTheme(e.target.value);
      });
    }

    // Langue
    const languageSelect = document.getElementById('language');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        this.updateSetting('language', e.target.value);
        this.applyLanguage(e.target.value);
      });
    }

    // Notifications
    const notificationsToggle = document.getElementById('notifications');
    if (notificationsToggle) {
      notificationsToggle.addEventListener('change', (e) => {
        this.updateSetting('notifications', e.target.checked);
      });
    }

    const soundNotificationsToggle = document.getElementById('soundNotifications');
    if (soundNotificationsToggle) {
      soundNotificationsToggle.addEventListener('change', (e) => {
        this.updateSetting('soundNotifications', e.target.checked);
      });
    }

    // Synchronisation
    const autoSyncToggle = document.getElementById('autoSync');
    if (autoSyncToggle) {
      autoSyncToggle.addEventListener('change', (e) => {
        this.updateSetting('autoSync', e.target.checked);
      });
    }

    const syncIntervalSelect = document.getElementById('syncInterval');
    if (syncIntervalSelect) {
      syncIntervalSelect.addEventListener('change', (e) => {
        this.updateSetting('syncInterval', parseInt(e.target.value));
      });
    }

    const syncGPTsToggle = document.getElementById('syncGPTs');
    if (syncGPTsToggle) {
      syncGPTsToggle.addEventListener('change', (e) => {
        this.updateSetting('syncGPTs', e.target.checked);
      });
    }

    const syncConversationsToggle = document.getElementById('syncConversations');
    if (syncConversationsToggle) {
      syncConversationsToggle.addEventListener('change', (e) => {
        this.updateSetting('syncConversations', e.target.checked);
      });
    }

    // Couleurs
    const primaryColorInput = document.getElementById('primaryColor');
    if (primaryColorInput) {
      primaryColorInput.addEventListener('input', (e) => {
        this.updateSetting('primaryColor', e.target.value);
        this.applyColors();
      });
    }

    const backgroundColorInput = document.getElementById('backgroundColor');
    if (backgroundColorInput) {
      backgroundColorInput.addEventListener('input', (e) => {
        this.updateSetting('backgroundColor', e.target.value);
        this.applyColors();
      });
    }

    // Raccourcis clavier
    const configureShortcuts = document.getElementById('configureShortcuts');
    if (configureShortcuts) {
      configureShortcuts.addEventListener('click', () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      });
    }

    // Synchronisation manuelle
    const syncNow = document.getElementById('syncNow');
    if (syncNow) {
      syncNow.addEventListener('click', () => {
        this.performManualSync();
      });
    }

    // Reset sync
    const resetSync = document.getElementById('resetSync');
    if (resetSync) {
      resetSync.addEventListener('click', () => {
        this.resetSyncData();
      });
    }
  }

  setupDataHandlers() {
    // Export
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportAllData();
      });
    }

    // Import
    const importBtn = document.getElementById('importData');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        this.importData();
      });
    }

    // Nettoyage
    const cleanDuplicates = document.getElementById('cleanDuplicates');
    if (cleanDuplicates) {
      cleanDuplicates.addEventListener('click', () => {
        this.cleanDuplicates();
      });
    }

    const clearOldData = document.getElementById('clearOldData');
    if (clearOldData) {
      clearOldData.addEventListener('click', () => {
        this.clearOldData();
      });
    }

    const resetAllData = document.getElementById('resetAllData');
    if (resetAllData) {
      resetAllData.addEventListener('click', () => {
        this.resetAllData();
      });
    }
  }

  setupCategoriesManager() {
    const addCategoryBtn = document.getElementById('addCategory');
    const newCategoryInput = document.getElementById('newCategoryName');

    if (addCategoryBtn && newCategoryInput) {
      addCategoryBtn.addEventListener('click', () => {
        const categoryName = newCategoryInput.value.trim();
        if (categoryName) {
          this.addCategory(categoryName);
          newCategoryInput.value = '';
        }
      });

      newCategoryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          addCategoryBtn.click();
        }
      });
    }
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    await chrome.storage.local.set({ settings: this.settings });
    
    // Notification du background script si nécessaire
    if (['autoSync', 'syncInterval', 'notifications'].includes(key)) {
      try {
        await chrome.runtime.sendMessage({
          action: 'updateSettings',
          settings: this.settings
        });
      } catch (error) {
        console.warn('Impossible de notifier le background script:', error);
      }
    }
  }

  loadSettings() {
    // Chargement des valeurs dans l'interface
    const theme = document.getElementById('theme');
    if (theme) theme.value = this.settings.theme || 'light';
    
    const language = document.getElementById('language');
    if (language) language.value = this.settings.language || 'fr';
    
    const notifications = document.getElementById('notifications');
    if (notifications) notifications.checked = this.settings.notifications !== false;
    
    const soundNotifications = document.getElementById('soundNotifications');
    if (soundNotifications) soundNotifications.checked = this.settings.soundNotifications || false;
    
    const autoSync = document.getElementById('autoSync');
    if (autoSync) autoSync.checked = this.settings.autoSync !== false;
    
    const syncInterval = document.getElementById('syncInterval');
    if (syncInterval) syncInterval.value = this.settings.syncInterval || 5;
    
    const syncGPTs = document.getElementById('syncGPTs');
    if (syncGPTs) syncGPTs.checked = this.settings.syncGPTs !== false;
    
    const syncConversations = document.getElementById('syncConversations');
    if (syncConversations) syncConversations.checked = this.settings.syncConversations !== false;
    
    const primaryColor = document.getElementById('primaryColor');
    if (primaryColor) primaryColor.value = this.settings.primaryColor || '#10a37f';
    
    const backgroundColor = document.getElementById('backgroundColor');
    if (backgroundColor) backgroundColor.value = this.settings.backgroundColor || '#ffffff';

    // Application du thème
    this.applyTheme(this.settings.theme || 'light');
    this.applyColors();
    this.applyLanguage(this.settings.language || 'fr');

    // Mise à jour du statut de sync
    this.updateSyncStatus();
  }

  applyTheme(theme) {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);
  }

  applyColors() {
    document.documentElement.style.setProperty('--primary-color', this.settings.primaryColor);
    document.documentElement.style.setProperty('--background', this.settings.backgroundColor);
  }

  applyLanguage(lang) {
    const texts = {
      fr: {
        navGeneral: 'Général',
        navSync: 'Synchronisation',
        navCategories: 'Catégories',
        navCustom: 'Personnalisation',
        navData: 'Données',
        navGpts: 'GPTs',
        navConvs: 'Conversations',
        navStats: 'Statistiques',
        navAbout: 'À propos',
        syncNow: 'Synchroniser maintenant'
      },
      en: {
        navGeneral: 'General',
        navSync: 'Sync',
        navCategories: 'Categories',
        navCustom: 'Custom',
        navData: 'Data',
        navGpts: 'GPTs',
        navConvs: 'Conversations',
        navStats: 'Stats',
        navAbout: 'About',
        syncNow: 'Sync now'
      }
    };

    const t = texts[lang] || texts.fr;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = t[key];
      if (!val) return;
      const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim());
      if (textNode) {
        textNode.nodeValue = val;
      } else {
        el.textContent = val;
      }
    });
  }

  async updateSyncStatus(syncing = false) {
    const stats = await this.getStorageData('stats') || {};
    const lastSync = stats.lastSyncTime;
    const lastSyncElement = document.getElementById('lastSyncTime');
    const statusElement = document.getElementById('syncStatus');

    if (syncing) {
      if (statusElement) {
        statusElement.textContent = 'En cours...';
        statusElement.className = 'status-value status-active';
      }
    } else if (lastSync) {
      const date = new Date(lastSync);
      if (lastSyncElement) lastSyncElement.textContent = this.formatDate(date);
      if (statusElement) {
        statusElement.textContent = 'Actif';
        statusElement.className = 'status-value status-active';
      }
    } else {
      if (lastSyncElement) lastSyncElement.textContent = 'Jamais';
      if (statusElement) {
        statusElement.textContent = 'Inactif';
        statusElement.className = 'status-value status-inactive';
      }
    }
  }

  async performManualSync() {
    const syncBtn = document.getElementById('syncNow');
    if (!syncBtn) return;

    const originalText = syncBtn.innerHTML;

    this.updateSyncStatus(true);
    syncBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="animate-spin">
        <path d="M23 4V10H17M1 20V14H7M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 8.36 18.36L13 14" stroke="currentColor" stroke-width="2"/>
      </svg>
      Synchronisation...
    `;
    syncBtn.disabled = true;

    try {
      // Chercher les onglets ChatGPT
      const tabs = await chrome.tabs.query({
        url: ['*://chat.openai.com/*', '*://chatgpt.com/*']
      });
      
      if (tabs.length === 0) {
        throw new Error('Aucun onglet ChatGPT ouvert. Veuillez ouvrir ChatGPT dans un onglet.');
      }

      console.log('Onglet ChatGPT trouvé:', tabs[0]);

      // Injection du content script
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      });

      console.log('Content script injecté');

      // Synchronisation des GPTs
      let gptRes = null;
      if (this.settings.syncGPTs) {
        try {
          gptRes = await chrome.tabs.sendMessage(tabs[0].id, { action: 'syncGPTs' });
          console.log('Réponse GPTs:', gptRes);
        } catch (error) {
          console.error('Erreur sync GPTs:', error);
        }
      }

      // Synchronisation des conversations
      let convRes = null;
      if (this.settings.syncConversations) {
        try {
          convRes = await chrome.tabs.sendMessage(tabs[0].id, { action: 'syncConversations' });
          console.log('Réponse conversations:', convRes);
        } catch (error) {
          console.error('Erreur sync conversations:', error);
        }
      }

      // Traitement des résultats
      let totalGPTs = 0;
      let totalConversations = 0;

      if (gptRes && gptRes.success && gptRes.gpts) {
        await chrome.storage.local.set({ gpts: gptRes.gpts });
        this.data.gpts = gptRes.gpts;
        totalGPTs = gptRes.gpts.length;
      } else {
        console.warn('Aucune donnée GPT reçue');
        this.showToast('Aucune donnée GPT reçue', 'warning');
      }

      if (convRes && convRes.success && convRes.conversations) {
        await chrome.storage.local.set({ conversations: convRes.conversations });
        this.data.conversations = convRes.conversations;
        totalConversations = convRes.conversations.length;
      } else {
        console.warn('Aucune donnée conversation reçue');
        this.showToast('Aucune conversation reçue', 'warning');
      }

      // Mise à jour des statistiques
      const stats = await chrome.storage.local.get('stats');
      const newStats = {
        ...(stats.stats || {}),
        totalSyncs: (stats.stats?.totalSyncs || 0) + 1,
        totalGPTs: totalGPTs,
        totalConversations: totalConversations,
        lastSyncTime: Date.now()
      };
      await chrome.storage.local.set({ stats: newStats });
      this.data.stats = newStats;

      // Mise à jour de l'interface
      this.updateDataSummary();
      this.updateSyncStatus();
      this.updateStats();
      this.renderGptList();
      this.renderConvList();
      this.loadCategories();

      this.showToast(`${totalGPTs} GPTs et ${totalConversations} conversations synchronisés`, 'success');

    } catch (error) {
      console.error('Erreur sync manuel:', error);
      this.showToast(error.message || 'Échec de la synchronisation', 'error');
    } finally {
      syncBtn.innerHTML = originalText;
      syncBtn.disabled = false;
      this.updateSyncStatus();
    }
  }

  async resetSyncData() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser les données de synchronisation ?')) {
      await chrome.storage.local.remove(['lastAutoSync', 'lastSyncTime']);
      this.updateSyncStatus();
      this.showToast('Données de synchronisation réinitialisées', 'success');
    }
  }

  updateDataSummary() {
    const totalGPTs = document.getElementById('totalGPTs');
    if (totalGPTs) totalGPTs.textContent = this.data.gpts.length;
    
    const totalConversations = document.getElementById('totalConversations');
    if (totalConversations) totalConversations.textContent = this.data.conversations.length;
    
    const totalCategories = document.getElementById('totalCategories');
    if (totalCategories) totalCategories.textContent = this.settings.categories.length;
    
    // Calcul de la taille approximative des données
    const dataStr = JSON.stringify(this.data);
    const sizeKB = Math.round(new Blob([dataStr]).size / 1024);
    const dataSize = document.getElementById('dataSize');
    if (dataSize) dataSize.textContent = `${sizeKB} KB`;
  }

  async updateStats() {
    const stats = this.data.stats || {};
    
    const totalSyncs = document.getElementById('totalSyncs');
    if (totalSyncs) totalSyncs.textContent = stats.totalSyncs || 0;
    
    const avgSyncTime = document.getElementById('avgSyncTime');
    if (avgSyncTime) avgSyncTime.textContent = `${stats.avgSyncTime || 0}s`;
    
    const favoriteGPTs = document.getElementById('favoriteGPTs');
    if (favoriteGPTs) {
      favoriteGPTs.textContent = this.data.gpts.filter(gpt => gpt.favorite).length;
    }
    
    const activeConversations = document.getElementById('activeConversations');
    if (activeConversations) {
      activeConversations.textContent = this.data.conversations.filter(conv => 
        new Date(conv.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;
    }
  }

  loadCategories() {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;
    
    const categories = this.settings.categories || [];
    
    categoriesList.innerHTML = categories.map(category => {
      const count = this.data.gpts.filter(gpt => gpt.category === category).length;
      
      return `
        <div class="category-item" data-category="${category}">
          <div>
            <span class="category-name">${this.getCategoryDisplayName(category)}</span>
            <span class="category-count">${count}</span>
          </div>
          <div class="category-actions">
            <button class="edit-category" title="Modifier">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="delete-category" title="Supprimer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Ajout des event listeners pour les actions
    this.attachCategoryEventListeners();
  }

  attachCategoryEventListeners() {
    document.querySelectorAll('.delete-category').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const categoryItem = e.target.closest('.category-item');
        const category = categoryItem.dataset.category;
        this.deleteCategory(category);
      });
    });

    document.querySelectorAll('.edit-category').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const categoryItem = e.target.closest('.category-item');
        const category = categoryItem.dataset.category;
        this.editCategory(category);
      });
    });
  }

  getCategoryDisplayName(category) {
    const names = {
      'writing': 'Écriture',
      'coding': 'Programmation',
      'analysis': 'Analyse',
      'creative': 'Créatif',
      'business': 'Business',
      'education': 'Éducation',
      'other': 'Autre'
    };
    return names[category] || category;
  }

  async addCategory(categoryName) {
    const categories = [...this.settings.categories];
    const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-');
    
    if (categories.includes(categoryId)) {
      this.showToast('Cette catégorie existe déjà', 'warning');
      return;
    }

    categories.push(categoryId);
    await this.updateSetting('categories', categories);
    this.loadCategories();
    this.showToast('Catégorie ajoutée', 'success');
  }

  async deleteCategory(category) {
    if (confirm(`Supprimer la catégorie "${this.getCategoryDisplayName(category)}" ?`)) {
      const categories = this.settings.categories.filter(cat => cat !== category);
      
      // Mettre à jour les GPTs qui utilisent cette catégorie
      const updatedGPTs = this.data.gpts.map(gpt => {
        if (gpt.category === category) {
          return { ...gpt, category: 'other' };
        }
        return gpt;
      });

      await chrome.storage.local.set({ gpts: updatedGPTs });
      await this.updateSetting('categories', categories);
      
      this.data.gpts = updatedGPTs;
      this.loadCategories();
      this.updateDataSummary();
      this.showToast('Catégorie supprimée', 'success');
    }
  }

  editCategory(category) {
    const newName = prompt(
      `Nouveau nom pour "${this.getCategoryDisplayName(category)}" :`,
      this.getCategoryDisplayName(category)
    );

    if (newName && newName.trim()) {
      const newId = newName.toLowerCase().replace(/\s+/g, '-');
      if (this.settings.categories.includes(newId)) {
        this.showToast('Cette catégorie existe déjà', 'warning');
        return;
      }

      const categories = this.settings.categories.map(cat =>
        cat === category ? newId : cat
      );
      const updatedGPTs = this.data.gpts.map(gpt =>
        gpt.category === category ? { ...gpt, category: newId } : gpt
      );

      chrome.storage.local.set({ gpts: updatedGPTs });
      this.updateSetting('categories', categories);

      this.data.gpts = updatedGPTs;
      this.loadCategories();
      this.updateDataSummary();
      this.showToast('Catégorie modifiée', 'success');
    }
  }

  async exportAllData() {
    try {
      const exportData = {
        settings: this.settings,
        gpts: this.data.gpts,
        conversations: this.data.conversations,
        stats: this.data.stats,
        exportDate: new Date().toISOString(),
        version: chrome.runtime.getManifest().version
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatgpt-sync-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showToast('Données exportées avec succès', 'success');
    } catch (error) {
      console.error('Erreur export:', error);
      this.showToast('Erreur lors de l\'export', 'error');
    }
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedData = JSON.parse(text);
        
        if (confirm('Importer ces données ? Cela remplacera vos données actuelles.')) {
          if (importedData.settings) {
            this.settings = { ...this.settings, ...importedData.settings };
            await chrome.storage.local.set({ settings: this.settings });
          }
          
          if (importedData.gpts) {
            await chrome.storage.local.set({ gpts: importedData.gpts });
            this.data.gpts = importedData.gpts;
          }
          
          if (importedData.conversations) {
            await chrome.storage.local.set({ conversations: importedData.conversations });
            this.data.conversations = importedData.conversations;
          }
          
          this.loadSettings();
          this.updateDataSummary();
          this.updateStats();
          this.loadCategories();
          this.renderGptList();
          this.renderConvList();

          this.showToast('Données importées avec succès', 'success');
        }
      } catch (error) {
        console.error('Erreur import:', error);
        this.showToast('Erreur lors de l\'import du fichier', 'error');
      }
    });
    
    input.click();
  }

  async cleanDuplicates() {
    const originalGPTsCount = this.data.gpts.length;
    const originalConvsCount = this.data.conversations.length;
    
    // Déduplication des GPTs
    const uniqueGPTs = this.data.gpts.filter((gpt, index, self) => 
      index === self.findIndex(g => g.url === gpt.url || g.id === gpt.id)
    );
    
    // Déduplication des conversations
    const uniqueConvs = this.data.conversations.filter((conv, index, self) => 
      index === self.findIndex(c => c.url === conv.url || c.id === conv.id)
    );
    
    if (uniqueGPTs.length !== originalGPTsCount || uniqueConvs.length !== originalConvsCount) {
      await chrome.storage.local.set({
        gpts: uniqueGPTs,
        conversations: uniqueConvs
      });
      
      this.data.gpts = uniqueGPTs;
      this.data.conversations = uniqueConvs;
      
      this.updateDataSummary();
      this.loadCategories();
      this.renderGptList();
      this.renderConvList();
      
      const removedGPTs = originalGPTsCount - uniqueGPTs.length;
      const removedConvs = originalConvsCount - uniqueConvs.length;
      
      this.showToast(
        `${removedGPTs} GPTs et ${removedConvs} conversations dupliqués supprimés`,
        'success'
      );
    } else {
      this.showToast('Aucun doublon trouvé', 'success');
    }
  }

  async clearOldData() {
    if (confirm('Supprimer les données de plus de 30 jours ?')) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const recentConversations = this.data.conversations.filter(conv => 
        new Date(conv.updatedAt) > thirtyDaysAgo
      );
      
      const removedCount = this.data.conversations.length - recentConversations.length;
      
      if (removedCount > 0) {
        await chrome.storage.local.set({ conversations: recentConversations });
        this.data.conversations = recentConversations;
        this.updateDataSummary();
        this.renderConvList();
        this.showToast(`${removedCount} anciennes conversations supprimées`, 'success');
      } else {
        this.showToast('Aucune ancienne donnée à supprimer', 'success');
      }
    }
  }

  async resetAllData() {
    if (confirm('⚠️ ATTENTION: Cela supprimera TOUTES vos données. Êtes-vous sûr ?')) {
      if (confirm('Dernière confirmation: Supprimer toutes les données ?')) {
        await chrome.storage.local.clear();
        
        // Réinitialisation avec les valeurs par défaut
        this.settings = this.getDefaultSettings();
        this.data = { gpts: [], conversations: [], stats: {} };
        
        await chrome.storage.local.set({ settings: this.settings });
        
        this.loadSettings();
        this.updateDataSummary();
        this.updateStats();
        this.loadCategories();
        this.renderGptList();
        this.renderConvList();

        this.showToast('Toutes les données ont été supprimées', 'success');
      }
    }
  }

  renderChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Données du graphique
    const categoryData = {};
    this.data.gpts.forEach(gpt => {
      categoryData[gpt.category] = (categoryData[gpt.category] || 0) + 1;
    });
    
    // Simple bar chart
    const categories = Object.keys(categoryData);
    const values = Object.values(categoryData);
    const maxValue = Math.max(...values, 1);
    
    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (categories.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Aucune donnée à afficher', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    const barWidth = canvas.width / categories.length * 0.8;
    const barSpacing = canvas.width / categories.length * 0.2;
    
    categories.forEach((category, index) => {
      const value = values[index];
      const barHeight = (value / maxValue) * (canvas.height - 60);
      const x = index * (barWidth + barSpacing) + barSpacing / 2;
      const y = canvas.height - barHeight - 30;
      
      // Barre
      ctx.fillStyle = '#10a37f';
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Valeur
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
      
      // Label de catégorie
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Arial';
      ctx.fillText(
        this.getCategoryDisplayName(category).substring(0, 8), 
        x + barWidth / 2, 
        canvas.height - 10
      );
    });
  }

  renderGptList() {
    const container = document.getElementById('optionsGptList');
    if (!container) return;
    if (!this.data.gpts.length) {
      container.innerHTML = `<div class="placeholder">Aucun GPT disponible</div>`;
      return;
    }
    container.innerHTML = this.data.gpts.map(gpt => `
      <div class="item-row"><img src="${gpt.iconUrl || 'icons/icon16.png'}" alt="">${escapeHTML(gpt.name)}</div>
    `).join('');
  }

  renderConvList() {
    const container = document.getElementById('optionsConvList');
    if (!container) return;
    if (!this.data.conversations.length) {
      container.innerHTML = `<div class="placeholder">Aucune conversation</div>`;
      return;
    }
    container.innerHTML = this.data.conversations.map(conv => `
      <div class="item-row"><img src="icons/icon16.png" alt="">${escapeHTML(conv.title)}</div>
    `).join('');
  }

  updateVersion() {
    const version = chrome.runtime.getManifest().version;
    const versionEl = document.getElementById('version');
    if (versionEl) versionEl.textContent = version;
    
    const aboutVersionEl = document.getElementById('aboutVersion');
    if (aboutVersionEl) aboutVersionEl.textContent = version;
    
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) lastUpdateEl.textContent = new Date().getFullYear();
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 4000);
  }

  formatDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  async getStorageData(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});

// Gestion du thème automatique
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const themeEl = document.getElementById('theme');
  if (themeEl && themeEl.value === 'auto') {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  }
});

// Animation pour le spinner de synchronisation
const styles = document.createElement('style');
styles.textContent = `
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styles);