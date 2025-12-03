// Estado da aplicação
let produtos = [];
let produtoEditando = null;
let produtoParaExcluir = null;
let isDragging = false;
let dragStartX, dragStartY;
let imageStartX = 0, imageStartY = 0;
let currentImageX = 0, currentImageY = 0;
let currentZoom = 1;

// Elementos do DOM
const elements = {
  productsList: document.getElementById('products-list'),
  editModal: document.getElementById('edit-modal'),
  deleteModal: document.getElementById('delete-modal'),
  editProductImage: document.getElementById('edit-product-image'),
  editProductNameDisplay: document.getElementById('edit-product-name-display'),
  editProductPriceDisplay: document.getElementById('edit-product-price-display'),
  editProductName: document.getElementById('edit-product-name'),
  editProductDescription: document.getElementById('edit-product-description'),
  editProductPrice: document.getElementById('edit-product-price'),
  editProductCategory: document.getElementById('edit-product-category'),
  saveProductBtn: document.getElementById('save-product-btn'),
  // Elements for adding new product
  addModal: document.getElementById('add-modal'),
  addProductName: document.getElementById('add-product-name'),
  addProductDescription: document.getElementById('add-product-description'),
  addProductPrice: document.getElementById('add-product-price'),
  addProductCategory: document.getElementById('add-product-category'),
  addProductImageUrl: document.getElementById('add-product-image-url'),
  addProductSaveBtn: document.getElementById('add-product-save-btn'),
  addProductBtn: document.getElementById('add-product-btn'),
  // Categories modal elements
  categoriesBtn: document.getElementById('categories-btn'),
  categoriesModal: document.getElementById('categories-modal'),
  categoriesList: document.getElementById('categories-list'),
  newCategoryName: document.getElementById('new-category-name'),
  createCategoryBtn: document.getElementById('create-category-btn'),
  closeButtons: document.querySelectorAll('.close-button'),
  deleteProductName: document.getElementById('delete-product-name'),
  cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
  // Elementos de zoom //top
  zoomInBtn: document.getElementById('zoom-in-btn'),
  zoomOutBtn: document.getElementById('zoom-out-btn'),
  resetZoomBtn: document.getElementById('reset-zoom-btn'),
  // Elementos das abas
  tabUpload: document.getElementById('tab-upload'),
  tabUrl: document.getElementById('tab-url'),
  uploadContent: document.getElementById('upload-content'),
  urlContent: document.getElementById('url-content'),
  // Elementos do formulário de edição
  imageFile: document.getElementById('image-file'),
  imageUrl: document.getElementById('image-url'),
  saveUrlBtn: document.getElementById('save-url-btn'),
  uploadImageBtn: document.getElementById('upload-image-btn'),
  // Elementos do modal de exclusão
  cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
  // Novos elementos para o WhatsApp
  whatsappBtn: document.getElementById('whatsapp-btn'),
  whatsappModal: document.getElementById('whatsapp-modal'),
  qrCodeContainer: document.getElementById('qr-code-container'),
  refreshQrBtn: document.getElementById('refresh-qr-btn')
};

// Verificar se todos os elementos foram encontrados
function verificarElementos() {
  const elementosObrigatorios = [
    elements.productsList,
    elements.editModal,
    elements.deleteModal,
    elements.editProductImage,
    elements.editProductNameDisplay,
    elements.editProductPriceDisplay,
    elements.editProductName,
    elements.editProductDescription,
    elements.editProductPrice,
    elements.editProductCategory,
    elements.saveProductBtn,
    elements.deleteProductName,
    elements.cancelDeleteBtn,
    elements.confirmDeleteBtn,
    elements.zoomInBtn,
    elements.zoomOutBtn,
    elements.resetZoomBtn,
    elements.tabUpload,
    elements.tabUrl,
    elements.uploadContent,
    elements.urlContent,
    elements.imageFile,
    elements.imageUrl,
    elements.saveUrlBtn,
    elements.uploadImageBtn
  ];

  const elementosFaltando = elementosObrigatorios.filter(el => !el);
  if (elementosFaltando.length > 0) {
    console.warn('Elementos não encontrados:', elementosFaltando);
  }
}

// REMOVED: Funções de configuração de impressão
/*
// Carregar configuração de impressão automática
function carregarConfiguracaoImpressao() {
  const autoPrint = localStorage.getItem('autoPrintEnabled') === 'true';
  if (elements.autoPrintToggle) {
    elements.autoPrintToggle.checked = autoPrint;
  }
}

// Salvar configuração de impressão automática
function salvarConfiguracaoImpressao() {
  if (elements.autoPrintToggle) {
    localStorage.setItem('autoPrintEnabled', elements.autoPrintToggle.checked);
  }
}
*/

// Função para carregar produtos
async function carregarProdutos() {
  try {
    console.log('Carregando produtos...');
    const res = await fetch('/api/produtos');
    console.log('Resposta da API:', res);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    produtos = await res.json();
    console.log('Produtos carregados:', produtos);
    renderizarProdutos();
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    // Mostrar mensagem de erro na interface
    elements.productsList.innerHTML = `
      <div class="error-message">
        <p>Erro ao carregar produtos: ${error.message}</p>
        <button onclick="carregarProdutos()">Tentar novamente</button>
      </div>
    `;
  }
}

// --- CATEGORIAS ---
async function carregarCategorias() {
  try {
    const res = await fetch('/api/categorias');
    if (!res.ok) throw new Error('Erro ao buscar categorias');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao buscar categorias');
    const categorias = data.categorias || [];
    // cache das categorias para uso no dropdown
    window.categoriasCache = categorias;
    // Render list in modal
    if (elements.categoriesList) {
      elements.categoriesList.innerHTML = categorias.map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;">
          <div>${c.nome}</div>
          <div>
            <button class="delete-category-btn" data-id="${c.id}">Excluir</button>
          </div>
        </div>
      `).join('');
      // attach delete listeners
      document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (!confirm('Excluir categoria? Os produtos vinculados terão categoria limpa.')) return;
          await excluirCategoria(id);
        });
      });
    }

    // populate selects (if elements are <select>) or leave inputs as-is
    const addCatEl = document.getElementById('add-product-category');
    const editCatEl = document.getElementById('edit-product-category');
    [addCatEl, editCatEl].forEach(el => {
      if (!el) return;
      if (el.tagName === 'SELECT') {
        el.innerHTML = '';
        categorias.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.nome;
          opt.textContent = c.nome;
          el.appendChild(opt);
        });
      }
      // if it's an <input>, we don't overwrite value here; a dropdown will be shown on click
    });
  } catch (err) {
    console.error('Erro carregarCategorias:', err);
  }
}

// Mostrar dropdown de categorias ao clicar no campo de categoria (input)
function showCategoryDropdown(inputEl) {
  if (!window.categoriasCache) window.categoriasCache = [];

  // se já existe, remover para recriar (toggle)
  const existing = inputEl.parentElement.querySelector('.category-dropdown');
  if (existing) {
    existing.remove();
    return;
  }

  // posicionar no body com fixed para evitar clipping em containers com overflow
  const rect = inputEl.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.className = 'category-dropdown';
  dropdown.style.position = 'fixed';
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.width = `${rect.width}px`;
  // usar cores do tema escuro
  dropdown.style.background = 'var(--bg-card)';
  dropdown.style.color = 'var(--text-primary)';
  dropdown.style.border = '1px solid var(--border-dark)';
  dropdown.style.borderRadius = '4px';
  dropdown.style.boxShadow = '0 6px 18px rgba(0,0,0,0.5)';
  dropdown.style.maxHeight = '240px';
  dropdown.style.overflow = 'auto';
  dropdown.style.zIndex = 99999;

  if (!window.categoriasCache || window.categoriasCache.length === 0) {
    const li = document.createElement('div');
    li.style.padding = '8px';
    li.style.color = 'var(--text-secondary)';
    li.textContent = 'Nenhuma categoria';
    dropdown.appendChild(li);
  } else {
    window.categoriasCache.forEach(c => {
      const item = document.createElement('div');
      item.style.padding = '10px 12px';
      item.style.cursor = 'pointer';
      item.style.borderBottom = '1px solid var(--border-dark)';
      item.style.color = 'var(--text-primary)';
      item.textContent = c.nome;
      item.addEventListener('mouseenter', () => {
        item.style.background = '#2d2d2d';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });
      item.addEventListener('click', () => {
        inputEl.value = c.nome;
        // dispatch input/change events for any listeners
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        dropdown.remove();
      });
      dropdown.appendChild(item);
    });
  }

  // click outside close
  setTimeout(() => { // timeout para evitar fechar imediatamente ao abrir
    const onDocClick = (e) => {
      if (!dropdown.contains(e.target) && e.target !== inputEl) {
        dropdown.remove();
        document.removeEventListener('click', onDocClick);
      }
    };
    document.addEventListener('click', onDocClick);
  }, 0);

  document.body.appendChild(dropdown);
  // scroll into view if dropdown is out of viewport
  const dRect = dropdown.getBoundingClientRect();
  if (dRect.bottom > window.innerHeight) {
    dropdown.style.top = `${Math.max(8, window.innerHeight - dRect.height - 8)}px`;
  }
}

async function criarCategoria() {
  const nome = (elements.newCategoryName && elements.newCategoryName.value) ? elements.newCategoryName.value.trim() : '';
  if (!nome) return alert('Informe o nome da categoria');
  try {
    const res = await fetch('/api/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) });
    const data = await res.json();
    if (data.success) {
      elements.newCategoryName.value = '';
      carregarCategorias();
      alert('Categoria criada');
    } else {
      alert('Erro: ' + (data.error || 'Não foi possível criar categoria'));
    }
  } catch (err) {
    console.error('Erro criarCategoria:', err);
    alert('Erro ao criar categoria');
  }
}

async function excluirCategoria(id) {
  try {
    const res = await fetch(`/api/categorias/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      carregarCategorias();
      carregarProdutos();
    } else {
      alert('Erro ao excluir: ' + (data.error || ''));
    }
  } catch (err) {
    console.error('Erro excluirCategoria:', err);
    alert('Erro ao excluir categoria');
  }
}

// Função para gerar SVG placeholder inline
function getPlaceholderSVG(width, height, text = '') {
  // Codificar o texto para uso em SVG
  const encodedText = encodeURIComponent(text);
  
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='100%25' height='100%25' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='${Math.min(width, height) / 8}' fill='%23666'%3E${encodedText}%3C/text%3E%3C/svg%3E`;
}

// Renderizar produtos
function renderizarProdutos() {
  console.log('Renderizando produtos...');
  console.log('Número de produtos a renderizar:', produtos.length);
  
  elements.productsList.innerHTML = '';
  
  if (produtos.length === 0) {
    elements.productsList.innerHTML = '<p class="no-products">Nenhum produto cadastrado.</p>';
    return;
  }
  
  produtos.forEach(produto => {
    const productCard = document.createElement('div');
    productCard.className = 'admin-product-card';
    productCard.innerHTML = `
      <img src="${produto.imagem || getPlaceholderSVG(80, 80, 'Imagem')}" 
           alt="${produto.nome}" 
           class="admin-product-image" 
           onerror="this.src='${getPlaceholderSVG(80, 80, 'Erro')}'; this.onerror=null;">
      <div class="admin-product-info">
        <h3>${produto.nome}</h3>
        <p class="admin-product-category">${produto.categoria}</p>
        <p class="admin-product-description">${produto.descricao || 'Sem descrição'}</p>
        <p class="admin-product-price">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
      </div>
      <div class="admin-product-actions">
        <button class="edit-image-btn" data-id="${produto.id}">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button class="delete-product-btn" data-id="${produto.id}" data-name="${produto.nome}">
          <i class="fas fa-trash"></i> Excluir
        </button>
      </div>
    `;
    elements.productsList.appendChild(productCard);
  });
  
  console.log('Produtos renderizados:', produtos.length);
  
  // Adicionar eventos aos botões de editar
  document.querySelectorAll('.edit-image-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const produtoId = parseInt(e.target.closest('.edit-image-btn').dataset.id);
      const produto = produtos.find(p => p.id === produtoId);
      if (produto) {
        mostrarModalEdicao(produto);
      }
    });
  });
  
  // Adicionar eventos aos botões de excluir
  document.querySelectorAll('.delete-product-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const produtoId = parseInt(e.target.closest('.delete-product-btn').dataset.id);
      const produtoNome = e.target.closest('.delete-product-btn').dataset.name;
      const produto = produtos.find(p => p.id === produtoId);
      if (produto) {
        mostrarModalExclusao(produto);
      }
    });
  });
}

// Mostrar modal de adição
function mostrarModalAdicao() {
  // Limpar campos do formulário
  elements.addProductName.value = '';
  elements.addProductDescription.value = '';
  elements.addProductPrice.value = '';
  elements.addProductCategory.value = 'Lanches Especiais';
  elements.addProductImageUrl.value = '';
  
  mostrarModal(elements.addModal);
}

// Criar novo produto
async function criarProduto() {
  const nome = elements.addProductName.value.trim();
  const descricao = elements.addProductDescription.value.trim();
  const preco = parseFloat(elements.addProductPrice.value);
  const categoria = elements.addProductCategory.value;
  const imagem = elements.addProductImageUrl.value.trim();
  
  if (!nome || isNaN(preco) || preco < 0 || !categoria) {
    alert('Por favor, preencha todos os campos obrigatórios corretamente.');
    return;
  }
  
  try {
    const response = await fetch('/api/produtos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nome, descricao, preco, categoria, imagem: imagem || null })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Fechar modal
      fecharModal(elements.addModal);
      
      // Recarregar produtos
      carregarProdutos();
      
      alert('Produto adicionado com sucesso!');
    } else {
      alert('Erro ao adicionar produto: ' + result.error);
    }
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    alert('Erro ao criar produto. Por favor, tente novamente.');
  }
}

// Mostrar modal de edição
function mostrarModalEdicao(produto) {
  produtoEditando = produto;
  
  // Resetar estado da imagem
  resetarImagem();
  
  // Atualizar imagem e informações do produto
  elements.editProductImage.src = produto.imagem || getPlaceholderSVG(80, 80, 'Imagem');
  elements.editProductImage.alt = produto.nome;
  elements.editProductNameDisplay.textContent = produto.nome;
  elements.editProductPriceDisplay.textContent = `R$ ${produto.preco.toFixed(2).replace('.', ',')}`;
  
  // Preencher campos do formulário
  elements.editProductName.value = produto.nome;
  elements.editProductDescription.value = produto.descricao || '';
  elements.editProductPrice.value = produto.preco;
  elements.editProductCategory.value = produto.categoria;
  elements.imageUrl.value = produto.imagem || '';
  elements.imageFile.value = '';
  
  // Mostrar aba de upload por padrão
  mostrarAba('upload');
  
  // Adicionar eventos de drag and drop
  adicionarEventosDrag();
  
  mostrarModal(elements.editModal);
}

// Resetar estado da imagem
function resetarImagem() {
  isDragging = false;
  currentImageX = 0;
  currentImageY = 0;
  currentZoom = 1;
  if (elements.editProductImage) {
    elements.editProductImage.style.transform = 'translate(0px, 0px) scale(1)';
  }
}

// Adicionar eventos de drag and drop
function adicionarEventosDrag() {
  if (!elements.editProductImage) return;
  
  // Evento de mouse down (início do arrasto)
  elements.editProductImage.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Apenas botão esquerdo do mouse
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    imageStartX = currentImageX;
    imageStartY = currentImageY;
    elements.editProductImage.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  // Evento de mouse move (durante o arrasto)
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    currentImageX = imageStartX + deltaX;
    currentImageY = imageStartY + deltaY;
    
    elements.editProductImage.style.transform = `translate(${currentImageX}px, ${currentImageY}px) scale(${currentZoom})`;
  });
  
  // Evento de mouse up (fim do arrasto)
  document.addEventListener('mouseup', () => {
    isDragging = false;
    if (elements.editProductImage) {
      elements.editProductImage.style.cursor = 'grab';
    }
  });
  
  // Definir cursor inicial
  elements.editProductImage.style.cursor = 'grab';
}

// Funções de zoom
function aplicarZoom() {
  if (elements.editProductImage) {
    elements.editProductImage.style.transform = `translate(${currentImageX}px, ${currentImageY}px) scale(${currentZoom})`;
  }
}

function zoomIn() {
  currentZoom = Math.min(currentZoom + 0.1, 3); // Limite máximo de 3x
  aplicarZoom();
}

function zoomOut() {
  currentZoom = Math.max(currentZoom - 0.1, 0.5); // Limite mínimo de 0.5x
  aplicarZoom();
}

function resetarZoom() {
  currentZoom = 1;
  aplicarZoom();
}

// Mostrar modal de exclusão
function mostrarModalExclusao(produto) {
  produtoParaExcluir = produto;
  
  elements.deleteProductName.textContent = produto.nome;
  
  mostrarModal(elements.deleteModal);
}

// Mostrar aba
function mostrarAba(aba) {
  // Atualizar botões das abas
  elements.tabUpload.classList.toggle('active', aba === 'upload');
  elements.tabUrl.classList.toggle('active', aba === 'url');
  
  // Mostrar conteúdo da aba selecionada
  elements.uploadContent.classList.toggle('active', aba === 'upload');
  elements.urlContent.classList.toggle('active', aba === 'url');
}

// Salvar dados do produto
async function salvarProduto() {
  if (!produtoEditando) return;
  
  const nome = elements.editProductName.value.trim();
  const descricao = elements.editProductDescription.value.trim();
  const preco = parseFloat(elements.editProductPrice.value);
  const categoria = elements.editProductCategory.value.trim();
  
  if (!nome || isNaN(preco) || preco < 0 || !categoria) {
    alert('Por favor, preencha todos os campos obrigatórios corretamente.');
    return;
  }
  
  try {
    const response = await fetch(`/api/produtos/${produtoEditando.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nome, descricao, preco, categoria })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Atualizar produto na lista
      const index = produtos.findIndex(p => p.id === produtoEditando.id);
      if (index !== -1) {
        produtos[index] = { ...produtos[index], nome, descricao, preco, categoria };
      }
      
      // Atualizar informações no modal
      elements.editProductNameDisplay.textContent = nome;
      elements.editProductPriceDisplay.textContent = `R$ ${preco.toFixed(2).replace('.', ',')}`;
      
      // Fechar modal
      fecharModal(elements.editModal);
      
      // Recarregar produtos
      carregarProdutos();
      
      alert('Produto atualizado com sucesso!');
    } else {
      alert('Erro ao atualizar produto: ' + result.error);
    }
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    alert('Erro ao salvar produto. Por favor, tente novamente.');
  }
}

// Excluir produto
async function excluirProduto() {
  if (!produtoParaExcluir) return;
  
  try {
    const response = await fetch(`/api/produtos/${produtoParaExcluir.id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Fechar modal
      fecharModal(elements.deleteModal);
      
      // Recarregar produtos
      carregarProdutos();
      
      alert('Produto excluído com sucesso!');
    } else {
      alert('Erro ao excluir produto: ' + result.error);
    }
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    alert('Erro ao excluir produto. Por favor, tente novamente.');
  }
}

// Salvar imagem via URL
async function salvarImagemUrl() {
  if (!produtoEditando) return;
  
  const imageUrl = elements.imageUrl.value.trim();
  
  if (!imageUrl) {
    alert('Por favor, insira uma URL de imagem válida.');
    return;
  }
  
  try {
    const response = await fetch(`/api/produtos/${produtoEditando.id}/imagem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imagem: imageUrl })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Atualizar produto na lista
      const index = produtos.findIndex(p => p.id === produtoEditando.id);
      if (index !== -1) {
        produtos[index].imagem = imageUrl;
      }
      
      // Atualizar imagem no modal
      elements.editProductImage.src = imageUrl;
      
      // Resetar posição e zoom
      resetarImagem();
      
      alert('Imagem atualizada com sucesso!');
    } else {
      alert('Erro ao atualizar imagem: ' + result.error);
    }
  } catch (error) {
    console.error('Erro ao salvar imagem:', error);
    alert('Erro ao salvar imagem. Por favor, tente novamente.');
  }
}

// Fazer upload de imagem
async function fazerUploadImagem() {
  if (!produtoEditando) return;
  
  const file = elements.imageFile.files[0];
  
  if (!file) {
    alert('Por favor, selecione uma imagem para fazer upload.');
    return;
  }
  
  // Verificar se é uma imagem
  if (!file.type.startsWith('image/')) {
    alert('Por favor, selecione um arquivo de imagem válido.');
    return;
  }
  
  // Verificar tamanho (máximo 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('A imagem deve ter no máximo 5MB.');
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('imagem', file);
    
    const response = await fetch(`/api/produtos/${produtoEditando.id}/upload`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Atualizar produto na lista
      const index = produtos.findIndex(p => p.id === produtoEditando.id);
      if (index !== -1) {
        produtos[index].imagem = result.imagePath;
      }
      
      // Atualizar imagem no modal
      elements.editProductImage.src = result.imagePath;
      
      // Resetar posição e zoom
      resetarImagem();
      
      alert('Imagem atualizada com sucesso!');
    } else {
      alert('Erro ao fazer upload da imagem: ' + result.error);
    }
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    alert('Erro ao fazer upload da imagem. Por favor, tente novamente.');
  }
}

// Mostrar modal
function mostrarModal(modal) {
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

// Fechar modal
function fecharModal(modal) {
  modal.classList.remove('show');
  document.body.style.overflow = 'auto';
}

// Função para carregar o QR Code do WhatsApp
async function carregarQRCode() {
  try {
    const response = await fetch('/api/whatsapp/qr-code');
    const data = await response.json();
    
    if (data.success) {
      // Verificar o status da resposta
      if (data.status === 'connected') {
        elements.qrCodeContainer.innerHTML = `
          <div class="whatsapp-connected">
            <i class="fab fa-whatsapp" style="font-size: 48px; color: #25D366; margin-bottom: 20px;"></i>
            <h3>WhatsApp Conectado!</h3>
            <p>O WhatsApp do restaurante já está vinculado e funcionando corretamente.</p>
          </div>
        `;
      } else if (data.status === 'qr_available' && data.qrCode) {
        elements.qrCodeContainer.innerHTML = `
          <img src="${data.qrCode}" alt="QR Code do WhatsApp" style="width: 100%; max-width: 300px;">
          <p style="margin-top: 15px; font-weight: bold;">Escaneie este QR Code com o WhatsApp do seu celular</p>
        `;
      }
    } else {
      // Tratar diferentes tipos de erro
      if (data.status === 'pending') {
        elements.qrCodeContainer.innerHTML = `
          <div class="whatsapp-pending">
            <i class="fas fa-clock" style="font-size: 48px; color: #f39c12; margin-bottom: 20px;"></i>
            <h3>Aguardando inicialização...</h3>
            <p>O cliente do WhatsApp está sendo inicializado. Por favor, aguarde alguns segundos e tente novamente.</p>
            <button id="retry-qr-btn" class="checkout-button" style="margin-top: 15px;">Tentar Novamente</button>
          </div>
        `;
        
        // Adicionar evento para o botão de tentar novamente
        const retryBtn = document.getElementById('retry-qr-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', carregarQRCode);
        }
      } else {
        elements.qrCodeContainer.innerHTML = `
          <div class="whatsapp-error">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c; margin-bottom: 20px;"></i>
            <h3>Erro ao carregar QR Code</h3>
            <p>${data.error || 'Ocorreu um erro ao carregar o QR Code. Por favor, tente novamente.'}</p>
            <button id="retry-qr-btn" class="checkout-button" style="margin-top: 15px;">Tentar Novamente</button>
          </div>
        `;
        
        // Adicionar evento para o botão de tentar novamente
        const retryBtn = document.getElementById('retry-qr-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', carregarQRCode);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao carregar QR Code:', error);
    elements.qrCodeContainer.innerHTML = `
      <div class="whatsapp-error">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c; margin-bottom: 20px;"></i>
        <h3>Erro de Conexão</h3>
        <p>Não foi possível conectar ao servidor. Por favor, verifique sua conexão e tente novamente.</p>
        <button id="retry-qr-btn" class="checkout-button" style="margin-top: 15px;">Tentar Novamente</button>
      </div>
    `;
    
    // Adicionar evento para o botão de tentar novamente
    const retryBtn = document.getElementById('retry-qr-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', carregarQRCode);
    }
  }
}

// Mostrar modal do WhatsApp
function mostrarModalWhatsApp() {
  // Mostrar modal
  elements.whatsappModal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Carregar QR Code
  carregarQRCode();
}

// Fechar modal do WhatsApp
function fecharModalWhatsApp() {
  elements.whatsappModal.classList.remove('show');
  document.body.style.overflow = 'auto';
}

// Event Listeners
// Verificar se os elementos existem antes de adicionar event listeners
if (elements.saveUrlBtn) {
  elements.saveUrlBtn.addEventListener('click', salvarImagemUrl);
}
if (elements.uploadImageBtn) {
  elements.uploadImageBtn.addEventListener('click', fazerUploadImagem);
}
if (elements.saveProductBtn) {
  elements.saveProductBtn.addEventListener('click', salvarProduto);
}
// Event listener for adding new product (show modal)
if (elements.addProductBtn) {
  elements.addProductBtn.addEventListener('click', mostrarModalAdicao);
}
// Event listener for save button on add modal
if (elements.addProductSaveBtn) {
  elements.addProductSaveBtn.addEventListener('click', criarProduto);
}
// Categories modal listeners
if (elements.categoriesBtn) {
  elements.categoriesBtn.addEventListener('click', () => {
    mostrarModal(elements.categoriesModal);
    carregarCategorias();
  });
}
if (elements.createCategoryBtn) {
  elements.createCategoryBtn.addEventListener('click', criarCategoria);
}

// Close categories modal on close-button click is handled globally
if (elements.confirmDeleteBtn) {
  elements.confirmDeleteBtn.addEventListener('click', excluirProduto);
}
if (elements.cancelDeleteBtn) {
  elements.cancelDeleteBtn.addEventListener('click', () => fecharModal(elements.deleteModal));
}

// Event Listeners para zoom
if (elements.zoomInBtn) {
  elements.zoomInBtn.addEventListener('click', zoomIn);
}
if (elements.zoomOutBtn) {
  elements.zoomOutBtn.addEventListener('click', zoomOut);
}
if (elements.resetZoomBtn) {
  elements.resetZoomBtn.addEventListener('click', resetarZoom);
}

// Event Listeners para as abas
if (elements.tabUpload) {
  elements.tabUpload.addEventListener('click', () => mostrarAba('upload'));
}
if (elements.tabUrl) {
  elements.tabUrl.addEventListener('click', () => mostrarAba('url'));
}

// REMOVED: Event Listener para configuração de impressão
/*
if (elements.autoPrintToggle) {
  elements.autoPrintToggle.addEventListener('change', salvarConfiguracaoImpressao);
}
*/

// Adicionar evento para o botão do WhatsApp
if (elements.whatsappBtn) {
  elements.whatsappBtn.addEventListener('click', mostrarModalWhatsApp);
}

// Adicionar evento para o botão de atualizar QR Code
if (elements.refreshQrBtn) {
  elements.refreshQrBtn.addEventListener('click', carregarQRCode);
}

// Fechar modais com botão X
if (elements.closeButtons) {
  elements.closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      // Verificar se é o modal do WhatsApp
      if (modal === elements.whatsappModal) {
        fecharModalWhatsApp();
      } else {
        fecharModal(modal);
      }
    });
  });
}

// Fechar modais ao clicar fora
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      // Verificar se é o modal do WhatsApp
      if (modal === elements.whatsappModal) {
        fecharModalWhatsApp();
      } else {
        fecharModal(modal);
      }
    }
  });
});

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', () => {
  verificarElementos();
  carregarProdutos();
  // REMOVED: carregarConfiguracaoImpressao();
  
  // Adicionar evento para o botão de personalização
  const customizationBtn = document.getElementById('customization-btn');
  if (customizationBtn) {
    customizationBtn.addEventListener('click', () => {
      window.location.href = '/custom.html';
    });
  }

  // Attach category dropdown behavior to category inputs
  const addCatInput = document.getElementById('add-product-category');
  const editCatInput = document.getElementById('edit-product-category');
  [addCatInput, editCatInput].forEach(inputEl => {
    if (!inputEl) return;
    // on focus or click show dropdown; ensure categorias are loaded
    const opener = () => {
      if (!window.categoriasCache || window.categoriasCache.length === 0) {
        carregarCategorias().then(() => showCategoryDropdown(inputEl)).catch(() => showCategoryDropdown(inputEl));
      } else {
        showCategoryDropdown(inputEl);
      }
    };
    inputEl.addEventListener('focus', opener);
    inputEl.addEventListener('click', (e) => { e.stopPropagation(); opener(); });
  });
});
