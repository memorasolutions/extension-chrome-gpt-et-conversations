// État global de l'application
const AppState = {
  gpts: [],
  conversations: [],
  currentTab: 'gpts',
  searchQuery: '',
  filters: {
    category: 'all',
    sort: 'name',
    conversationFilter: 'all'
  },
  theme: 'light'
};

// Utilitaires
const Utils = {
  // Formatage des dates
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return date.toLocaleDateString('fr-FR');
  },

  // Génération d'ID unique
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Debounce pour la recherche
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Affichage des notifications toast
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  },

  // Validation d'URL
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
};

// Gestionnaire de stockage
const Storage = {
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },

  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },

  async getAll() {
    const result = await chrome.storage.local.get(null);
    return result;
  },

  async clear() {
    await chrome.storage.local.clear();
  }
};

// Gestionnaire de thème
const ThemeManager = {
  init() {
    this.loadTheme();
    this.loadColors();
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });
  },

  async loadTheme() {
    const savedTheme = await Storage.get('theme') || 'light';
    AppState.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
  },

  async loadColors() {
    const primary = await Storage.get('primaryColor');
    const background = await Storage.get('backgroundColor');
    if (primary) document.documentElement.style.setProperty('--primary-color', primary);
    if (background) document.documentElement.style.setProperty('--background', background);
  },

  async toggleTheme() {
    const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
    AppState.theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    await Storage.set('theme', newTheme);
  }
};

// Gestionnaire de synchronisation
const SyncManager = {
  async syncGPTs() {
    const syncBtn = document.getElementById('syncBtn');
    syncBtn.classList.add('syncing');
    
    try {
      // Envoi d'un message au content script pour récupérer les GPTs
      const tabs = await chrome.tabs.query({ url: ['*://chat.openai.com/*', '*://chatgpt.com/*'] });
      
      if (tabs.length === 0) {
        Utils.showToast('Veuillez ouvrir ChatGPT dans un onglet', 'error');
        return;
      }

      // Injection du script si nécessaire
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      });

      // Demande de synchronisation
      const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'syncGPTs' });
      
      if (response && response.gpts) {
        AppState.gpts = response.gpts;
        await Storage.set('gpts', AppState.gpts);
        this.renderGPTs();
        Utils.showToast(`${response.gpts.length} GPTs synchronisés`);
      }
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
      Utils.showToast('Erreur lors de la synchronisation', 'error');
    } finally {
      syncBtn.classList.remove('syncing');
    }
  },

  async syncConversations() {
    try {
      const tabs = await chrome.tabs.query({ url: ['*://chat.openai.com/*', '*://chatgpt.com/*'] });
      
      if (tabs.length === 0) {
        Utils.showToast('Veuillez ouvrir ChatGPT dans un onglet', 'error');
        return;
      }

      const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'syncConversations' });
      
      if (response && response.conversations) {
        AppState.conversations = response.conversations;
        await Storage.set('conversations', AppState.conversations);
        this.renderConversations();
        Utils.showToast(`${response.conversations.length} conversations synchronisées`);
      }
    } catch (error) {
      console.error('Erreur de synchronisation des conversations:', error);
      Utils.showToast('Erreur lors de la synchronisation des conversations', 'error');
    }
  },

  async updateSyncStats() {
    const stats = await Storage.get('stats') || {};
    stats.totalSyncs = (stats.totalSyncs || 0) + 1;
    stats.totalGPTs = AppState.gpts.length;
    stats.totalConversations = AppState.conversations.length;
    stats.lastSyncTime = Date.now();
    await Storage.set('stats', stats);
  },

  editGPT(id) {
    const gpt = AppState.gpts.find(g => g.id === id);
    let base = 'https://chatgpt.com';
    if (gpt && gpt.url) {
      try {
        const u = new URL(gpt.url);
        base = u.origin;
      } catch (_) {}
    }
    chrome.tabs.create({ url: `${base}/gpts/editor/${id}` });
  },

  renderGPTs() {
    const container = document.getElementById('gptsList');
    const filteredGPTs = this.filterAndSortGPTs();
    
    if (filteredGPTs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21L16.65 16.65"/>
          </svg>
          <h3>Aucun GPT trouvé</h3>
          <p>Synchronisez vos GPTs depuis ChatGPT ou ajoutez-en manuellement</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredGPTs.map(gpt => `
      <div class="item-card" data-id="${gpt.id}">
        <div class="item-header">
          <div class="item-title"><img class="item-icon" src="${gpt.iconUrl || 'icons/icon16.png'}" alt="">${gpt.name}</div>
          <div class="item-actions">
            <button class="item-btn favorite-btn ${gpt.favorite ? 'active' : ''}" title="Marquer comme favori">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="${gpt.favorite ? 'currentColor' : 'none'}" stroke="currentColor">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </button>
            <button class="item-btn edit-btn" title="Modifier">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="item-btn delete-btn" title="Supprimer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="item-description">${gpt.description}</div>
        <div class="item-footer">
          <div class="item-meta">
            <span class="category-badge">${gpt.category}</span>
            <span>${Utils.formatDate(gpt.lastUsed)}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Ajout des event listeners
    this.attachGPTEventListeners();
  },

  renderConversations() {
    const container = document.getElementById('conversationsList');
    const filteredConversations = this.filterConversations();
    
    if (filteredConversations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h3>Aucune conversation trouvée</h3>
          <p>Synchronisez vos conversations depuis ChatGPT</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredConversations.map(conv => `
      <div class="item-card" data-id="${conv.id}">
        <div class="item-header">
          <div class="item-title"><img class="item-icon" src="icons/icon16.png" alt="">${conv.title}</div>
          <div class="item-actions">
            <button class="item-btn star-btn ${conv.starred ? 'active' : ''}" title="Marquer avec une étoile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="${conv.starred ? 'currentColor' : 'none'}" stroke="currentColor">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </button>
            <button class="item-btn open-btn" title="Ouvrir">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15,3 21,3 21,9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="item-description">${conv.lastMessage}</div>
        <div class="item-footer">
          <div class="item-meta">
            <span>${conv.messageCount} messages</span>
            <span>${Utils.formatDate(conv.updatedAt)}</span>
          </div>
        </div>
      </div>
    `).join('');

    this.attachConversationEventListeners();
  },

  filterAndSortGPTs() {
    let filtered = AppState.gpts.filter(gpt => {
      const matchesSearch = gpt.name.toLowerCase().includes(AppState.searchQuery.toLowerCase()) ||
                           gpt.description.toLowerCase().includes(AppState.searchQuery.toLowerCase());
      const matchesCategory = AppState.filters.category === 'all' || 
                             (AppState.filters.category === 'favorites' && gpt.favorite) ||
                             gpt.category === AppState.filters.category;
      return matchesSearch && matchesCategory;
    });

    // Tri
    filtered.sort((a, b) => {
      switch (AppState.filters.sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return new Date(b.lastUsed) - new Date(a.lastUsed);
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  },

  filterConversations() {
    let filtered = AppState.conversations.filter(conv => {
      const matchesSearch = conv.title.toLowerCase().includes(AppState.searchQuery.toLowerCase()) ||
                           conv.lastMessage.toLowerCase().includes(AppState.searchQuery.toLowerCase());
      
      let matchesFilter = true;
      const now = new Date();
      const convDate = new Date(conv.updatedAt);
      
      switch (AppState.filters.conversationFilter) {
        case 'today':
          matchesFilter = convDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesFilter = convDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesFilter = convDate >= monthAgo;
          break;
        case 'starred':
          matchesFilter = conv.starred;
          break;
      }

      return matchesSearch && matchesFilter;
    });

    return filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  attachGPTEventListeners() {
    // Favoris
    document.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const card = btn.closest('.item-card');
        const gptId = card.dataset.id;
        const gpt = AppState.gpts.find(g => g.id === gptId);
        
        if (gpt) {
          gpt.favorite = !gpt.favorite;
          await Storage.set('gpts', AppState.gpts);
          this.renderGPTs();
        }
      });
    });

    // Ouverture des GPTs
    document.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        if (e.target.closest('.item-btn')) return;
        
        const gptId = card.dataset.id;
        const gpt = AppState.gpts.find(g => g.id === gptId);
        
        if (gpt && gpt.url) {
          // Mise à jour du compteur d'utilisation
          gpt.usageCount = (gpt.usageCount || 0) + 1;
          gpt.lastUsed = new Date().toISOString();
          await Storage.set('gpts', AppState.gpts);
          
          // Ouverture dans un nouvel onglet
          chrome.tabs.create({ url: gpt.url });
        }
      });
    });

    // Édition
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.item-card');
        const gptId = card.dataset.id;
        SyncManager.editGPT(gptId);
      });
    });

    // Suppression
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        if (confirm('Êtes-vous sûr de vouloir supprimer ce GPT ?')) {
          const card = btn.closest('.item-card');
          const gptId = card.dataset.id;
          AppState.gpts = AppState.gpts.filter(g => g.id !== gptId);
          await Storage.set('gpts', AppState.gpts);
          this.renderGPTs();
          Utils.showToast('GPT supprimé');
        }
      });
    });
  },

  attachConversationEventListeners() {
    // Étoiler
    document.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const card = btn.closest('.item-card');
        const convId = card.dataset.id;
        const conv = AppState.conversations.find(c => c.id === convId);
        
        if (conv) {
          conv.starred = !conv.starred;
          await Storage.set('conversations', AppState.conversations);
          this.renderConversations();
        }
      });
    });

    // Ouvrir conversation
    document.querySelectorAll('.open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.item-card');
        const convId = card.dataset.id;
        const conv = AppState.conversations.find(c => c.id === convId);
        
        if (conv && conv.url) {
          chrome.tabs.create({ url: conv.url });
        }
      });
    });

    // Renommer conversation par double-clic
    document.querySelectorAll('.item-title').forEach(titleEl => {
      titleEl.addEventListener('dblclick', async (e) => {
        e.stopPropagation();
        const card = titleEl.closest('.item-card');
        const convId = card.dataset.id;
        const conv = AppState.conversations.find(c => c.id === convId);
        if (!conv) return;
        const newTitle = prompt('Nouveau titre', conv.title);
        if (newTitle && newTitle.trim() && newTitle !== conv.title) {
          conv.title = newTitle.trim();
          conv.updatedAt = new Date().toISOString();
          await Storage.set('conversations', AppState.conversations);
          this.renderConversations();
          try {
            const tabs = await chrome.tabs.query({ url: ['*://chat.openai.com/*', '*://chatgpt.com/*'] });
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'renameConversation', id: conv.id, title: conv.title });
            }
          } catch (_) {}
        }
      });
    });
  }
};

// Gestionnaire de formulaires
const FormManager = {
  init() {
    this.setupAddGPTForm();
    this.setupAddConversationForm();
    this.setupImportExport();
    this.setupAddSwitcher();
  },

  setupAddGPTForm() {
    const form = document.getElementById('addGptForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const gptData = {
        id: Utils.generateId(),
        name: formData.get('gptName') || document.getElementById('gptName').value,
        description: formData.get('gptDescription') || document.getElementById('gptDescription').value,
        url: formData.get('gptUrl') || document.getElementById('gptUrl').value,
        iconUrl: '',
        category: formData.get('gptCategory') || document.getElementById('gptCategory').value,
        favorite: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };

      // Validation
      if (!gptData.name.trim()) {
        Utils.showToast('Le nom du GPT est requis', 'error');
        return;
      }

      if (gptData.url && !Utils.isValidUrl(gptData.url)) {
        Utils.showToast('URL invalide', 'error');
        return;
      }

      // Ajout à la liste
      AppState.gpts.push(gptData);
      await Storage.set('gpts', AppState.gpts);
      
      // Reset du formulaire
      form.reset();
      
      // Mise à jour de l'affichage
      SyncManager.renderGPTs();
      this.updateStats();
      
      Utils.showToast('GPT ajouté avec succès');
    });
  },

  setupAddConversationForm() {
    const form = document.getElementById('addConvForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('convTitle').value.trim();
      const url = document.getElementById('convUrl').value.trim();
      const lastMessage = document.getElementById('convLastMessage').value.trim();

      if (!title) {
        Utils.showToast('Le titre est requis', 'error');
        return;
      }

      const conv = {
        id: Utils.generateId(),
        title,
        url,
        lastMessage,
        starred: false,
        messageCount: 0,
        updatedAt: new Date().toISOString()
      };
      AppState.conversations.push(conv);
      await Storage.set('conversations', AppState.conversations);
      form.reset();
      SyncManager.renderConversations();
      this.updateStats();
      Utils.showToast('Conversation ajoutée');
    });
  },

  setupImportExport() {
    // Export
    document.getElementById('exportBtn').addEventListener('click', async () => {
      const data = {
        gpts: AppState.gpts,
        conversations: AppState.conversations,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatgpt-sync-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      Utils.showToast('Données exportées');
    });

    // Import
    document.getElementById('importBtn').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const data = JSON.parse(text);
          
          if (data.gpts) {
            AppState.gpts = [...AppState.gpts, ...data.gpts];
            await Storage.set('gpts', AppState.gpts);
          }
          
          if (data.conversations) {
            AppState.conversations = [...AppState.conversations, ...data.conversations];
            await Storage.set('conversations', AppState.conversations);
          }
          
          SyncManager.renderGPTs();
          SyncManager.renderConversations();
          this.updateStats();
          
          Utils.showToast('Données importées avec succès');
        } catch (error) {
          console.error('Erreur d\'import:', error);
          Utils.showToast('Erreur lors de l\'import du fichier', 'error');
        }
      });
      
      input.click();
    });
  },

  setupAddSwitcher() {
    const buttons = document.querySelectorAll('.switch-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.target;
        document.querySelectorAll('.add-section').forEach(sec => {
          sec.classList.toggle('active', sec.id === target);
        });
      });
    });
  },

  updateStats() {
    Storage.get('stats').then(stats => {
      document.getElementById('gptCount').textContent = `${stats?.totalGPTs ?? AppState.gpts.length} GPTs`;
      document.getElementById('conversationCount').textContent = `${stats?.totalConversations ?? AppState.conversations.length} conversations`;
      if (stats && stats.lastSyncTime) {
        document.getElementById('lastSync').textContent = Utils.formatDate(stats.lastSyncTime);
      }
    });
  }
};

// Gestionnaire de navigation
const NavigationManager = {
  init() {
    this.setupTabNavigation();
    this.setupSearch();
    this.setupFilters();
  },

  setupTabNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = tab.dataset.tab;
        this.switchTab(tabId);
      });
    });
  },

  switchTab(tabId) {
    AppState.currentTab = tabId;
    
    // Mise à jour des onglets
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Mise à jour du contenu
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `${tabId}-tab`);
    });

    // Chargement du contenu si nécessaire
    if (tabId === 'gpts') {
      SyncManager.renderGPTs();
    } else if (tabId === 'conversations') {
      SyncManager.renderConversations();
    }
  },

  setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const debouncedSearch = Utils.debounce((query) => {
      AppState.searchQuery = query;
      if (AppState.currentTab === 'gpts') {
        SyncManager.renderGPTs();
      } else if (AppState.currentTab === 'conversations') {
        SyncManager.renderConversations();
      }
    }, 300);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  },

  setupFilters() {
    // Filtres GPTs
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
      AppState.filters.category = e.target.value;
      SyncManager.renderGPTs();
    });

    document.getElementById('sortFilter').addEventListener('change', (e) => {
      AppState.filters.sort = e.target.value;
      SyncManager.renderGPTs();
    });

    // Filtres conversations
    document.getElementById('conversationFilter').addEventListener('change', (e) => {
      AppState.filters.conversationFilter = e.target.value;
      SyncManager.renderConversations();
    });
  }
};

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', async () => {
  // Chargement des données sauvegardées
  const savedGPTs = await Storage.get('gpts') || [];
  const savedConversations = await Storage.get('conversations') || [];
  
  AppState.gpts = savedGPTs;
  AppState.conversations = savedConversations;

  // Initialisation des gestionnaires
  ThemeManager.init();
  NavigationManager.init();
  FormManager.init();

  // Configuration des boutons principaux
  document.getElementById('syncBtn').addEventListener('click', async () => {
    await SyncManager.syncGPTs();
    await SyncManager.syncConversations();
    await SyncManager.updateSyncStats();
    FormManager.updateStats();
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Rendu initial
  SyncManager.renderGPTs();
  FormManager.updateStats();

  // Auto-sync au démarrage si l'utilisateur est sur ChatGPT
  try {
    const tabs = await chrome.tabs.query({ 
      active: true, 
      url: ['*://chat.openai.com/*', '*://chatgpt.com/*'] 
    });
    
    if (tabs.length > 0) {
      setTimeout(() => {
        SyncManager.syncGPTs().then(() => {
          SyncManager.updateSyncStats();
          FormManager.updateStats();
        });
      }, 1000);
    }
  } catch (error) {
    // Gestion silencieuse de l'erreur
  }
});