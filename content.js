// Content Script pour ChatGPT Sync Manager
// Ce script s'exécute dans le contexte de la page ChatGPT

if (typeof window === 'undefined' || !window.ChatGPTScraper) {
class ChatGPTScraper {
  constructor(autoInit = true) {
    this.isInitialized = false;
    this.observers = new Map();
    this.retryCount = 0;
    this.maxRetries = 3;
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
      return true; // Garde la connexion ouverte pour les réponses asynchrones
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

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      this.observers.set('main', observer);
    }
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

        case 'getCurrentPageTitle':
          sendResponse({ success: true, title: document.title });
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
    
    const gpts = [];
    
    // Méthode 1: Extraction depuis la sidebar des GPTs
    const gptElements = await this.findGPTElements();
    console.log(`${gptElements.length} éléments GPT trouvés`);
    
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

    // Méthode 3: Extraction depuis le menu Explore GPTs
    const exploreGPTs = await this.extractFromExploreGPTs();
    gpts.push(...exploreGPTs);

    // Déduplication par nom/URL
    const uniqueGPTs = this.deduplicateGPTs(gpts);
    
    console.log(`${uniqueGPTs.length} GPTs extraits au total`);
    return uniqueGPTs;
  }

  async findGPTElements() {
    // Sélecteurs multiples pour différentes versions de l'interface ChatGPT
    const selectors = [
      // Nouveaux sélecteurs 2024/2025
      '[data-testid="gpt-item"]',
      '[role="menuitem"]:has(a[href*="/g/"])',
      'div[role="button"]:has(a[href*="/g/"])',
      
      // Sélecteurs pour les liens directs
      'a[href*="/g/"]:not([href*="/gpts"])',
      
      // Sélecteurs pour les cartes GPT
      '.gpt-item',
      '.gpt-card',
      '[data-testid*="gpt"]',
      
      // Sélecteurs pour la sidebar
      'nav a[href*="/g/"]',
      'aside a[href*="/g/"]',
      
      // Sélecteurs génériques
      'li:has(a[href*="/g/"])',
      'div:has(a[href*="/g/"]) img[alt]',
    ];

    const elements = new Set();
    
    for (const selector of selectors) {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(el => elements.add(el));
      } catch (error) {
        console.warn(`Sélecteur invalide: ${selector}`, error);
      }
    }

    // Si pas d'éléments trouvés, attendre et réessayer
    if (elements.size === 0 && this.retryCount < this.maxRetries) {
      console.log('Aucun GPT trouvé, attente et nouvelle tentative...');
      await this.waitForContent();
      this.retryCount++;
      return this.findGPTElements();
    }

    return Array.from(elements);
  }

  async waitForContent(maxWait = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkContent = () => {
        const hasContent = document.querySelectorAll('a[href*="/g/"]').length > 0 ||
                          document.querySelectorAll('[data-testid*="gpt"]').length > 0 ||
                          document.querySelectorAll('.gpt-item').length > 0;
        
        if (hasContent || Date.now() - startTime > maxWait) {
          resolve();
        } else {
          setTimeout(checkContent, 200);
        }
      };
      
      checkContent();
    });
  }

  async parseGPTElement(element) {
    try {
      // Extraction du lien
      let link = element.href;
      if (!link) {
        const linkEl = element.querySelector('a[href*="/g/"]');
        link = linkEl?.href;
      }
      if (!link && element.closest('a[href*="/g/"]')) {
        link = element.closest('a[href*="/g/"]').href;
      }

      if (!link || !link.includes('/g/')) {
        return null;
      }

      // Extraction du nom
      let name = this.extractTextContent(element, [
        '[data-testid="gpt-name"]',
        '.gpt-name',
        'h3', 'h4', 'h5', 'h6',
        '[role="heading"]',
        'strong',
        '.font-bold',
        '.font-semibold',
        '.font-medium'
      ]);

      // Si pas de nom trouvé, utiliser le texte de l'élément
      if (!name) {
        const textContent = element.textContent?.trim();
        if (textContent) {
          // Prendre la première ligne non vide
          const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const filtered = lines.find(line => this.isValidGPTName(line));
          name = filtered || lines[0];
        }
      }

      if (!name || name.length < 2) {
        name = this.extractNameFromUrl(link) || 'GPT Sans Nom';
      }

      // Extraction de la description
      let description = this.extractTextContent(element, [
        '[data-testid="gpt-description"]',
        '.gpt-description',
        'p',
        '.text-sm',
        '.text-gray-500',
        '.text-gray-600',
        '.text-secondary'
      ]);

      // Si pas de description trouvée, chercher dans les éléments suivants
      if (!description) {
        const allText = element.textContent?.trim() || '';
        const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 1) {
          description = lines.slice(1).join(' ').substring(0, 200);
        }
      }

      // Nettoyage et validation
      name = this.cleanText(name);
      description = this.cleanText(description) || 'Aucune description disponible';

      // Extraction de l'ID depuis l'URL
      const urlMatch = link.match(/\/g\/([^/?]+)/);
      const gptId = urlMatch ? urlMatch[1] : this.generateId();

      // Catégorisation automatique basée sur le nom/description
      const category = this.categorizeGPT(name, description);

      // Extraction de l'icône
      let iconUrl = this.extractIcon(element);

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

  extractIcon(element) {
    // Chercher une image
    const imgEl = element.querySelector('img');
    if (imgEl && imgEl.src && !imgEl.src.includes('data:')) {
      return imgEl.src;
    }

    // Chercher un background-image
    const elementsToCheck = [element, ...element.querySelectorAll('*')];
    for (const el of elementsToCheck) {
      const style = getComputedStyle(el);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const match = bgImage.match(/url\("?(.*?)"?\)/);
        if (match && match[1] && !match[1].includes('data:')) {
          return match[1];
        }
      }
    }

    return null;
  }

  isValidGPTName(text) {
    if (!text || text.length < 2) return false;
    
    // Filtrer les textes qui ne sont pas des noms de GPT
    const invalidPatterns = [
      /^(today|hier|yesterday)$/i,
      /^\d{1,2}\/\d{1,2}/,
      /^(new|nouveau|créer|create)$/i,
      /^(chat|conversation|message)$/i,
      /^(settings|paramètres|options)$/i
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(text.trim()));
  }

  extractNameFromUrl(url) {
    const match = url.match(/\/g\/([^/?]+)/);
    if (match) {
      return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return null;
  }

  cleanText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}\s\-.,!?()]/gu, '')
      .trim()
      .substring(0, 200);
  }

  filterFallbackName(text) {
    if (!text) return '';
    return this.isValidGPTName(text) ? text : '';
  }

  categorizeGPT(name, description) {
    const text = (name + ' ' + description).toLowerCase();
    
    const categories = {
      'writing': ['écriture', 'write', 'rédaction', 'texte', 'article', 'blog', 'content', 'editor', 'writer'],
      'coding': ['code', 'programming', 'développement', 'dev', 'python', 'javascript', 'html', 'css', 'react', 'node'],
      'analysis': ['analyse', 'analysis', 'data', 'données', 'rapport', 'statistique', 'analytics', 'research'],
      'creative': ['créatif', 'creative', 'design', 'art', 'image', 'logo', 'dessin', 'graphic', 'photo'],
      'business': ['business', 'marketing', 'vente', 'commercial', 'entreprise', 'startup', 'finance', 'sales'],
      'education': ['éducation', 'education', 'apprentissage', 'cours', 'tuteur', 'learning', 'teaching', 'teacher']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  async extractGPTsFromGPTsPage() {
    console.log('Extraction depuis la page GPTs...');
    const gpts = [];
    
    // Attendre que la page se charge
    await this.waitForContent();
    
    const gptCards = document.querySelectorAll([
      '[data-testid="gpt-card"]',
      '.gpt-card',
      'div:has(a[href*="/g/"]):not(:has(a[href*="/gpts"]))',
      'article:has(a[href*="/g/"])',
      '.grid > div:has(a[href*="/g/"])'
    ].join(', '));
    
    for (const card of gptCards) {
      const gpt = await this.parseGPTElement(card);
      if (gpt) {
        gpts.push(gpt);
      }
    }

    console.log(`${gpts.length} GPTs extraits depuis la page GPTs`);
    return gpts;
  }

  async extractFromExploreGPTs() {
    console.log('Extraction depuis Explore GPTs...');
    const gpts = [];
    
    // Sélecteurs pour la section Explore
    const exploreSelectors = [
      '.grid a[href*="/g/"]',
      '[data-testid="explore-gpt-item"]',
      '.explore-gpts a[href*="/g/"]'
    ];

    for (const selector of exploreSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const gpt = await this.parseGPTElement(element);
          if (gpt) {
            gpts.push(gpt);
          }
        }
      } catch (error) {
        console.warn('Erreur extraction explore GPTs:', error);
      }
    }

    console.log(`${gpts.length} GPTs extraits depuis Explore`);
    return gpts;
  }

  async extractConversations() {
    console.log('Extraction des conversations...');
    
    const conversations = [];
    
    // Sélecteurs pour les conversations dans la sidebar
    const conversationSelectors = [
      '[data-testid="conversation-item"]',
      '.conversation-item',
      'a[href*="/c/"]:not([href*="/g/"])',
      'li:has(a[href*="/c/"])',
      'div[role="button"]:has(a[href*="/c/"])',
      'nav a[href*="/c/"]',
      'aside a[href*="/c/"]'
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

    console.log(`${conversationElements.length} éléments de conversation trouvés`);

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
      let link = element.href;
      if (!link) {
        const linkEl = element.querySelector('a[href*="/c/"]');
        link = linkEl?.href;
      }
      if (!link && element.closest('a[href*="/c/"]')) {
        link = element.closest('a[href*="/c/"]').href;
      }

      if (!link || !link.includes('/c/')) {
        return null;
      }

      // Extraction du titre
      const title = this.extractTextContent(element, [
        '[data-testid="conversation-title"]',
        '.conversation-title',
        'span',
        'div',
        'p',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
      ]) || this.extractTitleFromText(element) || 'Conversation sans titre';

      // Extraction du dernier message (si disponible)
      const lastMessage = this.extractTextContent(element, [
        '[data-testid="last-message"]',
        '.last-message',
        '.text-sm',
        '.preview',
        '.excerpt'
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
        updatedAt: this.extractDate(element) || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        source: 'chatgpt-sync'
      };
    } catch (error) {
      console.error('Erreur parsing conversation:', error);
      return null;
    }
  }

  extractTitleFromText(element) {
    const allText = element.textContent?.trim();
    if (!allText) return null;
    
    const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return lines.find(line => line.length > 3 && line.length < 100) || lines[0];
  }

  extractDate(element) {
    // Chercher des indicateurs de date dans le texte
    const text = element.textContent || '';
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(today|aujourd'hui|hier|yesterday)/i,
      /(\d{1,2}\/\d{1,2})/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const dateStr = match[1];
          if (dateStr.toLowerCase().includes('today') || dateStr.toLowerCase().includes('aujourd')) {
            return new Date().toISOString();
          } else if (dateStr.toLowerCase().includes('hier') || dateStr.toLowerCase().includes('yesterday')) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString();
          }
          // Essayer de parser d'autres formats de date
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    return null;
  }

  estimateMessageCount(element) {
    // Essayer d'estimer le nombre de messages
    const messageCountText = element.textContent?.match(/(\d+)\s*messages?/i);
    if (messageCountText) {
      return parseInt(messageCountText[1]);
    }
    
    // Estimation basée sur la longueur du texte
    const textLength = element.textContent?.length || 0;
    return Math.max(1, Math.floor(textLength / 100));
  }

  isConversationStarred(element) {
    // Vérifier si la conversation est marquée comme favorite
    const starSelectors = [
      '[data-testid="star"]',
      '.starred',
      '[aria-label*="star"]',
      '.favorite',
      '.bookmarked'
    ];
    
    for (const selector of starSelectors) {
      if (element.querySelector(selector)) {
        return true;
      }
    }
    
    return false;
  }

  deduplicateGPTs(gpts) {
    const seen = new Set();
    return gpts.filter(gpt => {
      const key = `${gpt.url}`;
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
      const key = conv.url;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  renameConversation(id, newTitle) {
    try {
      // Chercher la conversation par ID dans l'URL
      const links = document.querySelectorAll(`a[href*="/c/${id}"]`);
      for (const link of links) {
        const titleEl = link.querySelector('span, div, p') || link;
        if (titleEl.textContent) {
          titleEl.textContent = newTitle;
        }
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
  window.ChatGPTScraper = scraper;

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