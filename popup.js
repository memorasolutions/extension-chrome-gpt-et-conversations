// État global de l'application
const AppState = {
  gpts: [],
  conversations: [],
  categories: [],
  currentTab: 'gpts',
  searchQuery: '',
  filters: {
    category: 'all',
    sort: 'name',
    conversationFilter: 'all',
    conversationCategory: 'all'
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

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  // Échappe les caractères HTML pour éviter l'injection
  escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  // Affichage des notifications toast
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
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
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
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
    if (syncBtn) syncBtn.classList.add('syncing');
    
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
      if (syncBtn) syncBtn.classList.remove('syncing');
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

  // Fonction d'édition des GPT dans le popup - CORRIGÉE
  editGPT(id) {
    const gpt = AppState.gpts.find(g => g.id === id);
    if (!gpt) return;

    // Créer un prompt simple pour l'édition
    const newName = prompt('Nouveau nom du GPT:', gpt.name);
    if (newName && newName.trim() && newName !== gpt.name) {
      gpt.name = newName.trim();
      Storage.set('gpts', AppState.gpts);
      this.renderGPTs();
      Utils.showToast('GPT modifié', 'success');
    }
  },

  // Fonction d'édition de catégorie des GPT - CORRIGÉE
  editGPTCategory(id) {
    const gpt = AppState.gpts.find(g => g.id === id);
    if (!gpt) return;

    const modal = document.getElementById('itemModal');
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    if (!modal || !body || !title) return;

    title.textContent = `Catégorie pour ${gpt.name}`;
    body.innerHTML = `
      <div class="form-group">
        <label for="gptCatSelect">Choisir la catégorie</label>
        <select id="gptCatSelect" class="category-select">
          ${AppState.categories.map(cat => `<option value="${cat}" ${cat === gpt.category ? 'selected' : ''}>${Utils.capitalize(cat)}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button id="saveCat" class="btn-primary">OK</button>
      </div>`;

    modal.classList.add('show');

    const close = () => {
      modal.classList.remove('show');
      body.innerHTML = '';
    };
    modal.querySelector('.modal-close').onclick = close;

    body.querySelector('#saveCat').onclick = () => {
      const newCat = body.querySelector('#gptCatSelect').value;
      gpt.category = newCat;
      Storage.set('gpts', AppState.gpts);
      close();
      this.renderGPTs();
      Utils.showToast('Catégorie modifiée', 'success');
    };
  },

  renderGPTs() {
    const container = document.getElementById('gptsList');
    if (!container) return;
    
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
          <div class="item-title">
            <img class="item-icon" src="${gpt.iconUrl || 'icons/icon16.png'}" alt="">
            ${Utils.escapeHTML(gpt.name)}
          </div>
          <div class="item-actions">
            <button class="item-btn favorite-btn ${gpt.favorite ? 'active' : ''}" title="Marquer comme favori" data-action="favorite">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="${gpt.favorite ? 'currentColor' : 'none'}" stroke="currentColor">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </button>
            <button class="item-btn edit-btn" title="Modifier" data-action="edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="item-btn editor-btn" title="Éditer sur chatgpt.com" data-action="open-editor">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="10 14 21 3"/>
                <path d="M21 21H3V3"/>
              </svg>
            </button>
            <button class="item-btn delete-btn" title="Supprimer" data-action="delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="item-description">${Utils.escapeHTML(gpt.description)}</div>
        <div class="item-footer">
          <div class="item-meta">
            <span class="category-badge">${gpt.category}</span>
            <span>${Utils.formatDate(gpt.lastUsed)}</span>
          </div>
          <button class="item-btn category-btn" title="Changer catégorie" data-action="category">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 4H20V6H4V4ZM4 8H20V10H4V8ZM4 12H20V14H4V12ZM4 16H20V18H4V16Z"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    // Ajout des event listeners
    this.attachGPTEventListeners();
  },

  renderConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return;
    
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
          <div class="item-title" data-action="rename-title">
            <img class="item-icon" src="icons/icon16.png" alt="">
            ${Utils.escapeHTML(conv.title)}
          </div>
          <div class="item-actions">
            <button class="item-btn star-btn ${conv.starred ? 'active' : ''}" title="Marquer avec une étoile" data-action="star">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="${conv.starred ? 'currentColor' : 'none'}" stroke="currentColor">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </button>
            <button class="item-btn open-btn" title="Ouvrir" data-action="open">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15,3 21,3 21,9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </button>
            <button class="item-btn rename-btn" title="Renommer" data-action="rename">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="item-description">${Utils.escapeHTML(conv.lastMessage)}</div>
        <div class="item-footer">
          <div class="item-meta">
            <span>${conv.messageCount} messages</span>
            <span>${Utils.formatDate(conv.updatedAt)}</span>
          </div>
          <button class="item-btn category-btn" title="Changer catégorie" data-action="category">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 4H20V6H4V4ZM4 8H20V10H4V8ZM4 12H20V14H4V12ZM4 16H20V18H4V16Z"/>
            </svg>
          </button>
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
                             (AppState.filters.category === 'recent' && new Date(gpt.lastUsed) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
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

      const matchesCategory = AppState.filters.conversationCategory === 'all' || conv.category === AppState.filters.conversationCategory;

      return matchesSearch && matchesFilter && matchesCategory;
    });

    return filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  // Gestionnaire d'événements pour les GPT - CORRIGÉ
  attachGPTEventListeners() {
    // Gestionnaire délégué pour tous les boutons
    const container = document.getElementById('gptsList');
    if (!container) return;

    container.addEventListener('click', async (e) => {
      const button = e.target.closest('.item-btn');
      const card = e.target.closest('.item-card');
      
      if (!card) return;
      
      const gptId = card.dataset.id;
      const gpt = AppState.gpts.find(g => g.id === gptId);
      if (!gpt) return;

      if (button) {
        e.stopPropagation();
        const action = button.dataset.action;

        switch (action) {
          case 'favorite':
            gpt.favorite = !gpt.favorite;
            await Storage.set('gpts', AppState.gpts);
            this.renderGPTs();
            break;

          case 'edit':
            this.editGPT(gptId);
            break;

          case 'open-editor':
            if (gpt.url) {
              const match = gpt.url.match(/\/g\/([^/?]+)/);
              const id = match ? match[1] : gpt.id;
              chrome.tabs.create({ url: `https://chatgpt.com/gpts/editor/${id}` });
            }
            break;

          case 'category':
            this.editGPTCategory(gptId);
            break;

          case 'delete':
            if (confirm('Êtes-vous sûr de vouloir supprimer ce GPT ?')) {
              AppState.gpts = AppState.gpts.filter(g => g.id !== gptId);
              await Storage.set('gpts', AppState.gpts);
              this.renderGPTs();
              Utils.showToast('GPT supprimé');
            }
            break;
        }
      } else {
        // Clic sur la carte pour ouvrir le GPT
        if (gpt.url) {
          gpt.usageCount = (gpt.usageCount || 0) + 1;
          gpt.lastUsed = new Date().toISOString();
          await Storage.set('gpts', AppState.gpts);
          chrome.tabs.create({ url: gpt.url });
        }
      }
    });
  },

  // Gestionnaire d'événements pour les conversations - CORRIGÉ
  attachConversationEventListeners() {
    const container = document.getElementById('conversationsList');
    if (!container) return;

    container.addEventListener('click', async (e) => {
      const button = e.target.closest('.item-btn');
      const titleElement = e.target.closest('[data-action="rename-title"]');
      const card = e.target.closest('.item-card');
      
      if (!card) return;
      
      const convId = card.dataset.id;
      const conv = AppState.conversations.find(c => c.id === convId);
      if (!conv) return;

      if (button) {
        e.stopPropagation();
        const action = button.dataset.action;

        switch (action) {
          case 'star':
            conv.starred = !conv.starred;
            await Storage.set('conversations', AppState.conversations);
            this.renderConversations();
            break;

          case 'open':
            if (conv.url) {
              chrome.tabs.create({ url: conv.url });
            }
            break;

          case 'rename':
            this.renameConversation(convId);
            break;

          case 'category':
            this.editConversationCategory(convId);
            break;
        }
      } else if (titleElement) {
        // Double clic sur le titre pour renommer
        e.stopPropagation();
        this.renameConversation(convId);
      } else {
        // Clic sur la carte pour ouvrir
        if (conv.url) {
          chrome.tabs.create({ url: conv.url });
        }
      }
    });

    // Gestionnaire pour double-clic sur le titre
    container.addEventListener('dblclick', (e) => {
      const titleElement = e.target.closest('.item-title');
      if (titleElement) {
        const card = titleElement.closest('.item-card');
        if (card) {
          const convId = card.dataset.id;
          this.renameConversation(convId);
        }
      }
    });
  },

  // Fonction pour renommer une conversation - CORRIGÉE
  renameConversation(id) {
    const conv = AppState.conversations.find(c => c.id === id);
    if (!conv) return;

    const newTitle = prompt('Nouveau titre de la conversation:', conv.title);
    if (newTitle && newTitle.trim() && newTitle !== conv.title) {
      conv.title = newTitle.trim();
      conv.updatedAt = new Date().toISOString();
      Storage.set('conversations', AppState.conversations);
      this.renderConversations();
      
      // Essayer de notifier ChatGPT du changement
      this.notifyChatGPTRename(conv.id, conv.title);
      
      Utils.showToast('Conversation renommée', 'success');
    }
  },

  // Fonction pour changer la catégorie d'une conversation
  editConversationCategory(id) {
    const conv = AppState.conversations.find(c => c.id === id);
    if (!conv) return;

    const categoryOptions = AppState.categories.map(cat => 
      `${cat === conv.category ? '✓' : ' '} ${Utils.capitalize(cat)}`
    ).join('\n');

    const selectedCategory = prompt(
      `Choisir une catégorie pour "${conv.title}":\n\n${categoryOptions}\n\nEntrez le nom de la catégorie:`,
      conv.category || 'other'
    );

    if (selectedCategory && selectedCategory.trim() && AppState.categories.includes(selectedCategory.trim())) {
      conv.category = selectedCategory.trim();
      Storage.set('conversations', AppState.conversations);
      this.renderConversations();
      Utils.showToast('Catégorie modifiée', 'success');
    }
  },

  // Notifier ChatGPT du renommage
  async notifyChatGPTRename(convId, newTitle) {
    try {
      const tabs = await chrome.tabs.query({ url: ['*://chat.openai.com/*', '*://chatgpt.com/*'] });
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'renameConversation', 
          id: convId, 
          title: newTitle 
        });
      }
    } catch (error) {
      // Erreur silencieuse, pas critique
      console.warn('Impossible de notifier ChatGPT du renommage:', error);
    }
  }
};

// Gestionnaire de formulaires
const FormManager = {
  init() {
    this.populateCategorySelects();
    this.setupAddGPTForm();
    this.setupAddConversationForm();
    this.setupImportExport();
    this.setupAddSwitcher();
  },

  setupAddGPTForm() {
    const form = document.getElementById('addGptForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const gptData = {
        id: Utils.generateId(),
        name: document.getElementById('gptName').value.trim(),
        description: document.getElementById('gptDescription').value.trim(),
        url: document.getElementById('gptUrl').value.trim(),
        iconUrl: '',
        category: document.getElementById('gptCategory').value,
        favorite: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };

      // Validation
      if (!gptData.name) {
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
      const category = document.getElementById('convCategory').value;

      if (!title) {
        Utils.showToast('Le titre est requis', 'error');
        return;
      }

      const conv = {
        id: Utils.generateId(),
        title,
        url,
        lastMessage,
        category,
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
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
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
    }

    // Import
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
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
    }
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

  populateCategorySelects() {
    const options = AppState.categories.map(c => `<option value="${c}">${Utils.capitalize(c)}</option>`).join('');
    document.querySelectorAll('#gptCategory, #convCategory').forEach(sel => {
      sel.innerHTML = options;
    });
    const filterSel = document.getElementById('convCategoryFilter');
    if (filterSel) {
      filterSel.innerHTML = `<option value="all">Toutes les catégories</option>${options}`;
    }
  },

  updateStats() {
    Storage.get('stats').then(stats => {
      const gptCount = document.getElementById('gptCount');
      if (gptCount) gptCount.textContent = `${stats?.totalGPTs ?? AppState.gpts.length} GPTs`;
      
      const conversationCount = document.getElementById('conversationCount');
      if (conversationCount) conversationCount.textContent = `${stats?.totalConversations ?? AppState.conversations.length} conversations`;
      
      const lastSync = document.getElementById('lastSync');
      if (lastSync && stats && stats.lastSyncTime) {
        lastSync.textContent = Utils.formatDate(stats.lastSyncTime);
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
    if (!searchInput) return;
    
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
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        AppState.filters.category = e.target.value;
        SyncManager.renderGPTs();
      });
    }

    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        AppState.filters.sort = e.target.value;
        SyncManager.renderGPTs();
      });
    }

    // Filtres conversations
    const conversationFilter = document.getElementById('conversationFilter');
    if (conversationFilter) {
      conversationFilter.addEventListener('change', (e) => {
        AppState.filters.conversationFilter = e.target.value;
        SyncManager.renderConversations();
      });
    }

    const convCat = document.getElementById('convCategoryFilter');
    if (convCat) {
      convCat.addEventListener('change', (e) => {
        AppState.filters.conversationCategory = e.target.value;
        SyncManager.renderConversations();
      });
    }
  }
};

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Chargement des données sauvegardées
    const savedGPTs = await Storage.get('gpts') || [];
    const savedConversations = await Storage.get('conversations') || [];
    const settings = await Storage.get('settings') || {};

    AppState.gpts = savedGPTs;
    AppState.conversations = savedConversations.map(c => ({ category: 'other', ...c }));
    AppState.categories = settings.categories || ['writing', 'coding', 'analysis', 'creative', 'business', 'education', 'other'];

    // Initialisation des gestionnaires
    ThemeManager.init();
    NavigationManager.init();
    FormManager.init();

    // Configuration des boutons principaux
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        await SyncManager.syncGPTs();
        await SyncManager.syncConversations();
        await SyncManager.updateSyncStats();
        FormManager.updateStats();
      });
    }

    // Pas de bouton settings dans le popup, mais le menu peut être géré par extension
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }

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
      console.warn('Auto-sync échoué:', error);
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    Utils.showToast('Erreur lors de l\'initialisation', 'error');
  }
});