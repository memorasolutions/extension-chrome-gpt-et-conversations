// Content Script pour ChatGPT Sync Manager
// Ce script s'exécute dans le contexte de la page ChatGPT

if (typeof window === 'undefined' || !window.ChatGPTScraper) {
class ChatGPTScraper {
  constructor(autoInit = true) {
    this.isInitialized = false;
    this.observers = new Map();
    if (autoInit && typeof document !== 'undefined') {
      this.init();
    }
  }

  init() {
    if (this.isInitialized) return;
    
    console.log('ChatGPT Sync Manager - Content script initialisé');
    this.isInitialized = true;
    
    // Attendre que la page soit complètement chargée
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupObservers());
    } else {
      this.setupObservers();
    }

    // Écouter les messages de l'extension
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });
  }

  setupObservers() {
    // Observer pour détecter les changements dynamiques
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // La page a été mise à jour, on peut re-scanner
          this.debounce('page-update', () => {
            console.log('Page ChatGPT mise à jour');
          }, 1000);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.set('main', observer);
  }

  debounce(key, func, delay) {
    if (this.observers.has(key)) {
      clearTimeout(this.observers.get(key));
    }
    
    const timeoutId = setTimeout(func, delay);
    this.observers.set(key, timeoutId);
  }

  async handleMessage(request, sender, sendResponse) {
    console.log('Message reçu:', request);

    try {
      switch (request.action) {
        case 'syncGPTs':
          const gpts = await this.extractGPTs();
          sendResponse({ success: true, gpts });
          break;

        case 'syncConversations':
          const conversations = await this.extractConversations();
          sendResponse({ success: true, conversations });
          break;

        case 'getCurrentUrl':
          sendResponse({ success: true, url: window.location.href });
          break;

        case 'renameConversation':
          this.renameConversation(request.id, request.title);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Action non reconnue' });
      }
    } catch (error) {
      console.error('Erreur dans handleMessage:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async extractGPTs() {
    console.log('Extraction des GPTs...');
    
    // Différentes méthodes d'extraction selon la version de ChatGPT
    const gpts = [];
    
    // Méthode 1: Extraction depuis la sidebar des GPTs
    const gptElements = await this.findGPTElements();
    
    for (const element of gptElements) {
      try {
        const gpt = await this.parseGPTElement(element);
        if (gpt) {
          gpts.push(gpt);
        }
      } catch (error) {
        console.warn('Erreur lors du parsing d\'un GPT:', error);
      }
    }

    // Méthode 2: Extraction depuis la page "My GPTs" si on y est
    if (window.location.pathname.includes('/gpts') || window.location.pathname.includes('/g/')) {
      const pageGPTs = await this.extractGPTsFromGPTsPage();
      gpts.push(...pageGPTs);
    }

    // Déduplication par nom/URL
    const uniqueGPTs = this.deduplicateGPTs(gpts);
    
    console.log(`${uniqueGPTs.length} GPTs extraits`);
    return uniqueGPTs;
  }

  async findGPTElements() {
    const selectors = [
      // Sélecteurs pour la nouvelle interface
      '[data-testid="gpt-item"]',
      '.gpt-item',
      '[data-testid*="gpt"]',
      // Sélecteurs pour l'ancienne interface
      'a[href*="/g/"]',
      // Sélecteurs génériques
      'div[role="button"]:has(a[href*="/g/"])',
      'button:has(a[href*="/g/"])'
    ];

    const elements = [];
    
    for (const selector of selectors) {
      try {
        const found = document.querySelectorAll(selector);
        elements.push(...Array.from(found));
      } catch (error) {
        console.warn(`Sélecteur invalide: ${selector}`, error);
      }
    }

    // Attendre un peu pour que le contenu se charge
    if (elements.length === 0) {
      await this.waitForContent();
      
      // Retry avec des sélecteurs plus génériques
      const genericLinks = document.querySelectorAll('a[href*="/g/"]');
      elements.push(...Array.from(genericLinks));
    }

    return [...new Set(elements)]; // Déduplication
  }

  async waitForContent(maxWait = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkContent = () => {
        const hasContent = document.querySelectorAll('a[href*="/g/"]').length > 0 ||
                          document.querySelectorAll('[data-testid*="gpt"]').length > 0;
        
        if (hasContent || Date.now() - startTime > maxWait) {
          resolve();
        } else {
          setTimeout(checkContent, 100);
        }
      };
      
      checkContent();
    });
  }

  async parseGPTElement(element) {
    try {
      // Extraction du lien
      let link = element.href || element.querySelector('a')?.href;
      if (!link && element.closest('a')) {
        link = element.closest('a').href;
      }

      if (!link || !link.includes('/g/')) {
        return null;
      }

      // Extraction du nom
      let name = this.extractTextContent(element, [
        '[data-testid="gpt-name"]',
        '.gpt-name',
        'h3', 'h4', 'h5',
        '[role="heading"]',
        'strong',
        '.font-bold'
      ]);

      // Si pas de nom trouvé, utiliser le texte de l'élément
      if (!name) {
        const raw = element.textContent?.trim().split('\n')[0] || '';
        const filtered = this.filterFallbackName(raw);
        name = filtered || 'GPT Sans Nom';
      }

      // Extraction de la description
      let description = this.extractTextContent(element, [
        '[data-testid="gpt-description"]',
        '.gpt-description',
        'p',
        '.text-sm',
        '.text-gray-500'
      ]);

      // Nettoyage et validation
      name = this.cleanText(name);
      description = this.cleanText(description) || 'Aucune description disponible';

      // Extraction de l'ID depuis l'URL
      const urlMatch = link.match(/\/g\/([^/?]+)/);
      const gptId = urlMatch ? urlMatch[1] : this.generateId();

      // Catégorisation automatique basée sur le nom/description
      const category = this.categorizeGPT(name, description);

      // Extraction de l'icône
      let iconUrl = null;
      const imgEl = element.querySelector('img');
      if (imgEl && imgEl.src) {
        iconUrl = imgEl.src;
      } else {
        const styleBg = getComputedStyle(element).backgroundImage;
        const match = styleBg && styleBg !== 'none' ? styleBg.match(/url\("?(.*?)"?\)/) : null;
        if (match && match[1]) {
          iconUrl = match[1];
        }
      }

      return {
        id: gptId,
        name: name,
        description: description,
        iconUrl: iconUrl,
        url: link,
        category: category,
        favorite: false,
        usageCount: 0,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        source: 'chatgpt-sync'
      };
    } catch (error) {
      console.error('Erreur parsing GPT element:', error);
      return null;
    }
  }

  extractTextContent(element, selectors) {
    for (const selector of selectors) {
      try {
        const found = element.querySelector(selector);
        if (found && found.textContent?.trim()) {
          return found.textContent.trim();
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  cleanText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}\s\-.,!?()]/gu, '')
      .trim()
      .substring(0, 200); // Limite la longueur
  }

  filterFallbackName(text) {
    const t = text.trim();
    if (/^(today|hier)$/i.test(t) || /^\d{1,2}\/\d{1,2}/.test(t)) {
      return '';
    }
    return t;
  }

  categorizeGPT(name, description) {
    const text = (name + ' ' + description).toLowerCase();
    
    const categories = {
      'writing': ['écriture', 'write', 'rédaction', 'texte', 'article', 'blog', 'content'],
      'coding': ['code', 'programming', 'développement', 'dev', 'python', 'javascript', 'html'],
      'analysis': ['analyse', 'analysis', 'data', 'données', 'rapport', 'statistique'],
      'creative': ['créatif', 'creative', 'design', 'art', 'image', 'logo', 'dessin'],
      'business': ['business', 'marketing', 'vente', 'commercial', 'entreprise'],
      'education': ['éducation', 'education', 'apprentissage', 'cours', 'tuteur']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  async extractGPTsFromGPTsPage() {
    // Si on est sur la page des GPTs, extraction spécifique
    const gpts = [];
    
    // Attendre que la page se charge
    await this.waitForContent();
    
    const gptCards = document.querySelectorAll('[data-testid="gpt-card"], .gpt-card, div:has(a[href*="/g/"])');
    
    for (const card of gptCards) {
      const gpt = await this.parseGPTElement(card);
      if (gpt) {
        gpts.push(gpt);
      }
    }

    return gpts;
  }

  async extractConversations() {
    console.log('Extraction des conversations...');
    
    const conversations = [];
    
    // Sélecteurs pour les conversations dans la sidebar
    const conversationSelectors = [
      '[data-testid="conversation-item"]',
      '.conversation-item',
      'a[href*="/c/"]',
      'li:has(a[href*="/c/"])',
      'div[role="button"]:has(a[href*="/c/"])'
    ];

    let conversationElements = [];
    
    for (const selector of conversationSelectors) {
      try {
        const found = document.querySelectorAll(selector);
        conversationElements.push(...Array.from(found));
      } catch (error) {
        console.warn(`Sélecteur conversation invalide: ${selector}`);
      }
    }

    // Si pas de conversations trouvées, essayer d'autres méthodes
    if (conversationElements.length === 0) {
      await this.waitForContent();
      conversationElements = Array.from(document.querySelectorAll('a[href*="/c/"]'));
    }

    for (const element of conversationElements) {
      try {
        const conversation = await this.parseConversationElement(element);
        if (conversation) {
          conversations.push(conversation);
        }
      } catch (error) {
        console.warn('Erreur parsing conversation:', error);
      }
    }

    const uniqueConversations = this.deduplicateConversations(conversations);
    console.log(`${uniqueConversations.length} conversations extraites`);
    
    return uniqueConversations;
  }

  async parseConversationElement(element) {
    try {
      // Extraction du lien
      let link = element.href || element.querySelector('a')?.href;
      if (!link && element.closest('a')) {
        link = element.closest('a').href;
      }

      if (!link || !link.includes('/c/')) {
        return null;
      }

      // Extraction du titre
      const title = this.extractTextContent(element, [
        '[data-testid="conversation-title"]',
        '.conversation-title',
        'span', 'div',
        'p'
      ]) || 'Conversation sans titre';

      // Extraction du dernier message (si disponible)
      const lastMessage = this.extractTextContent(element, [
        '[data-testid="last-message"]',
        '.last-message',
        '.text-sm'
      ]) || 'Pas de prévisualisation disponible';

      // Extraction de l'ID depuis l'URL
      const urlMatch = link.match(/\/c\/([^/?]+)/);
      const conversationId = urlMatch ? urlMatch[1] : this.generateId();

        return {
          id: conversationId,
          title: this.cleanText(title),
          lastMessage: this.cleanText(lastMessage),
          url: link,
          messageCount: this.estimateMessageCount(element),
          starred: this.isConversationStarred(element),
          category: 'other',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          source: 'chatgpt-sync'
        };
    } catch (error) {
      console.error('Erreur parsing conversation:', error);
      return null;
    }
  }

  estimateMessageCount(element) {
    // Essayer d'estimer le nombre de messages (pas toujours disponible)
    const messageCountText = element.textContent?.match(/(\d+)\s*messages?/i);
    return messageCountText ? parseInt(messageCountText[1]) : 1;
  }

  isConversationStarred(element) {
    // Vérifier si la conversation est marquée comme favorite
    const starElement = element.querySelector('[data-testid="star"], .starred, [aria-label*="star"]');
    return starElement !== null;
  }

  deduplicateGPTs(gpts) {
    const seen = new Set();
    return gpts.filter(gpt => {
      const key = `${gpt.name}-${gpt.url}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  deduplicateConversations(conversations) {
    const seen = new Set();
    return conversations.filter(conv => {
      if (seen.has(conv.id)) {
        return false;
      }
      seen.add(conv.id);
      return true;
    });
  }

  renameConversation(id, newTitle) {
    try {
      const link = document.querySelector(`a[href*="/c/${id}"]`);
      if (link) {
        const titleEl = link.querySelector('span') || link;
        titleEl.textContent = newTitle;
      }
    } catch (e) {
      console.error('renameConversation error', e);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  destroy() {
    // Nettoyage des observers
    this.observers.forEach((observer, key) => {
      if (typeof observer.disconnect === 'function') {
        observer.disconnect();
      } else if (typeof observer === 'number') {
        clearTimeout(observer);
      }
    });
    this.observers.clear();
    this.isInitialized = false;
  }
}

// Initialisation du scraper
let scraper = null;

// Vérifier si on est sur ChatGPT
if (typeof window !== 'undefined' && (window.location.hostname.includes('openai.com') || window.location.hostname.includes('chatgpt.com'))) {
  scraper = new ChatGPTScraper();

  // Nettoyage lors du changement de page
  window.addEventListener('beforeunload', () => {
    if (scraper) {
      scraper.destroy();
    }
  });
}

// Export pour les tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChatGPTScraper };
}
}

