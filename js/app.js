document.addEventListener("DOMContentLoaded", () => {
  const lista = document.getElementById('lista-exercicios');
  const selectCategoria = document.getElementById('categoria');
  const selectMusculo = document.getElementById('musculo');
  const grupoLista = document.getElementById('grupo-exercicios');
  const saveBtn = document.getElementById('save-training');
  const chkFavoritos = document.getElementById('favoritos');
  const searchInput = document.getElementById('search-exercise');

  // Limites
  const MAX_TRAINING = 10;
  const ITEMS_PER_PAGE = 10;

  // Mapa de exercícios selecionados: id -> nome
  let selectedExercises = new Map();
  let currentFilteredExercises = [];
  let currentPage = 1;

  // Termo de busca
  let searchTerm = '';

  // Contador de treino
  const trainingHeader = document.querySelector('.training-header');
  const counterSpan = document.createElement('span');
  counterSpan.id = 'training-counter';
  counterSpan.textContent = `0/${MAX_TRAINING}`;
  counterSpan.style.margin = '0 15px';
  counterSpan.style.fontWeight = 'bold';
  trainingHeader.insertBefore(counterSpan, saveBtn);

  function updateCounter() {
    counterSpan.textContent = `${selectedExercises.size}/${MAX_TRAINING}`;
  }

  // Container de paginação
  let paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) {
    paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination';
    paginationContainer.className = 'pagination-controls';
    lista.parentNode.appendChild(paginationContainer);
  }

  // --- LocalStorage de favoritos ---
  const STORAGE_KEY = 'wger_favorites';

  function getFavorites() {
    const fav = localStorage.getItem(STORAGE_KEY);
    return fav ? JSON.parse(fav) : [];
  }

  function saveFavorites(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function isFavorite(id) {
    return getFavorites().includes(id);
  }

  function toggleFavorite(id) {
    let favs = getFavorites();
    if (isFavorite(id)) {
      favs = favs.filter(fid => fid !== id);
    } else {
      favs.push(id);
    }
    saveFavorites(favs);
    updateFavoriteIcon(id);
  }

  function updateFavoriteIcon(id) {
    const btn = document.querySelector(`.fav-btn[data-id="${id}"]`);
    if (!btn) return;
    btn.textContent = isFavorite(id) ? '★' : '☆';
  }

  function loadFavoritesUI() {
    document.querySelectorAll('.fav-btn').forEach(btn => {
      const id = parseInt(btn.getAttribute('data-id'));
      btn.textContent = isFavorite(id) ? '★' : '☆';
    });
  }
  // --- fim LocalStorage ---

  async function carregarCategorias() {
    const res = await fetch('https://wger.de/api/v2/exercisecategory/');
    const dados = await res.json();
    dados.results.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      selectCategoria.appendChild(opt);
    });
  }

  async function carregarMusculos() {
    const res = await fetch('https://wger.de/api/v2/muscle/');
    const dados = await res.json();
    dados.results.forEach(musculo => {
      const opt = document.createElement('option');
      opt.value = musculo.id;
      opt.textContent = musculo.name;
      selectMusculo.appendChild(opt);
    });
  }

  async function carregarExercicios(categoriaId = 0, musculoId = 0, somenteFavoritos = false) {
    const res = await fetch('https://wger.de/api/v2/exerciseinfo/?status=2&limit=1000');
    const dados = await res.json();
    currentFilteredExercises = dados.results.filter(ex => {
      const matchCategoria = categoriaId === 0 || ex.category.id === categoriaId;
      let matchMusculo = true;
      if (musculoId !== 0) {
        const ids = [...(ex.muscles || []), ...(ex.muscles_secondary || [])].map(m => m.id);
        matchMusculo = ids.includes(musculoId);
      }     
      return matchCategoria && matchMusculo;
    });

    if (somenteFavoritos) {
      const favs = getFavorites();
      currentFilteredExercises = currentFilteredExercises.filter(ex => favs.includes(ex.id));
    }

    // Aplica pesquisa por nome
    if (searchTerm.trim() !== '') {
      const lower = searchTerm.trim().toLowerCase();
      currentFilteredExercises = currentFilteredExercises.filter(ex => {
        const tr = ex.translations.find(t => t.language === 2) || ex.translations[0];
        return tr.name?.toLowerCase().includes(lower);
      });
    }

    if (currentFilteredExercises.length === 0) {
      lista.innerHTML = 'No exercises found with these filters.';
      return;
    }
    
    currentPage = 1;
    renderPage();
    renderPagination();
  }

  function renderPage() {
    lista.innerHTML = '';
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = currentFilteredExercises.slice(start, end);

    if (!pageItems.length) {
      lista.textContent = 'No exercises found with selected filters.';
      return;
    }

    pageItems.forEach(ex => {
      const tr = ex.translations.find(t => t.language === 2) || ex.translations[0];
      const nome = tr.name || 'No name';
      const desc = tr.description?.trim() || 'No description';

      const div = document.createElement('div');
      div.className = 'exercicio';
      div.dataset.id = ex.id;
      div.style.position = 'relative'; 

      let imgHTML = '';
      if (ex.images?.length) {
        imgHTML = `<img src="${ex.images[0].image}" alt="${nome}" />`;
      }

      div.innerHTML = `
        <h3>${nome}</h3>
        ${imgHTML}
        <div class="desc-container" style="display:none;">
          <p>${desc}</p>
        </div>
      `;

      // botão “Favoritar”
      const favBtn = document.createElement('button');
      favBtn.className = 'fav-btn';
      favBtn.setAttribute('data-id', ex.id);
      favBtn.setAttribute('title', 'Favoritar');
      favBtn.textContent = isFavorite(ex.id) ? '★' : '☆';

      favBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleFavorite(ex.id);
        updateFavoriteIcon(ex.id);
      });

      div.appendChild(favBtn);

      // botão “Info”
      const infoBtn = document.createElement('button');
      infoBtn.textContent = 'Info';
      infoBtn.className = 'show-info-btn';
      infoBtn.addEventListener('click', () => {
        const descDiv = div.querySelector('.desc-container');
        const hidden = descDiv.style.display === 'none';
        descDiv.style.display = hidden ? 'block' : 'none';
        infoBtn.textContent = hidden ? 'Hide' : 'Info';
      });
      div.appendChild(infoBtn);

      // botão “Add”
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add';
      addBtn.className = 'btn add-btn';
      addBtn.dataset.id = ex.id;
      addBtn.addEventListener('click', () => addExercise(ex.id, nome, div));
      div.appendChild(addBtn);

      if (selectedExercises.has(ex.id)) div.classList.add('added');

      lista.appendChild(div);
    });

    updateAddButtons();
  }

  function renderPagination() {
    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(currentFilteredExercises.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀';
    prevBtn.className = 'btn btn-default btn-sm';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => changePage(currentPage - 1));

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '▶';
    nextBtn.className = 'btn btn-default btn-sm';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => changePage(currentPage + 1));

    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    pageIndicator.style.margin = '0 10px';

    paginationContainer.append(prevBtn, pageIndicator, nextBtn);
  }

  function changePage(page) {
    currentPage = page;
    renderPage();
    renderPagination();
  }

  function updateAddButtons() {
    document.querySelectorAll('.add-btn').forEach(btn => {
      const id = parseInt(btn.dataset.id);
      btn.disabled = selectedExercises.has(id) || selectedExercises.size >= MAX_TRAINING;
    });
  }

  function addExercise(id, nome, card) {
    if (selectedExercises.size >= MAX_TRAINING) {
      alert(`You can only add up to ${MAX_TRAINING} exercises.`);
      return;
    }
    if (selectedExercises.has(id)) return;
    selectedExercises.set(id, nome);
    card.classList.add('added');

    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.dataset.id = id;
    li.textContent = nome;

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.className = 'remove-btn';
    removeBtn.addEventListener('click', () => removeExercise(id));
    li.appendChild(removeBtn);

    grupoLista.appendChild(li);
    updateAddButtons();
    updateCounter();
  }

  function removeExercise(id) {
    selectedExercises.delete(id);
    const li = grupoLista.querySelector(`li[data-id="${id}"]`);
    if (li) grupoLista.removeChild(li);
    const card = lista.querySelector(`.exercicio[data-id="${id}"]`);
    if (card) card.classList.remove('added');
    updateAddButtons();
    updateCounter();
  }

  // --- Função para salvar o grupo de treino ---
  function salvarGrupoTreino() {
    if (selectedExercises.size === 0) {
      alert('No exercises selected. Please select at least one exercise.');
      return;
    }
  
    const nomeGrupo = prompt('Training name:');
    if (!nomeGrupo) {
      alert('Invalid name. Please try again.');
      return;
    }
  
    // Monta o objeto do grupo
    const grupo = {
      id: Date.now(), // identifica de forma única
      nome: nomeGrupo,
      exercicios: Array.from(selectedExercises.entries())
                        .map(([id, nome]) => ({ id, nome }))
    };
  
    // Carrega array de grupos, adiciona o novo e salva tudo
    const key = 'grupos_treino_salvos';
    const todos = JSON.parse(localStorage.getItem(key)) || [];
    todos.push(grupo);
    localStorage.setItem(key, JSON.stringify(todos));
    
    alert(`Training "${nomeGrupo}" saved with ${grupo.exercicios.length} exercises.`);
  }
  
    // conecta o botão “Save” à função
    saveBtn.removeEventListener('click', salvarGrupoTreino);
    saveBtn.addEventListener('click', salvarGrupoTreino);

  // dispara o reload dos exercícios com todos os filtros
  function atualizarExercicios() {
    const categoriaId    = parseInt(selectCategoria.value);
    const musculoId      = parseInt(selectMusculo.value);
    const somenteFavoritos = chkFavoritos.checked;
    carregarExercicios(categoriaId, musculoId, somenteFavoritos)
      .then(loadFavoritesUI);
  }

  selectCategoria.addEventListener('change', atualizarExercicios);
  selectMusculo.addEventListener('change', atualizarExercicios);
  chkFavoritos.addEventListener('change', atualizarExercicios);

  // Listener da barra de pesquisa
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchTerm = searchInput.value;
      atualizarExercicios();
    });
  }

  carregarCategorias();
  carregarMusculos();
  carregarExercicios().then(loadFavoritesUI);
  updateCounter();
});
