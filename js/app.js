document.addEventListener("DOMContentLoaded", () => {
  const lista           = document.getElementById('lista-exercicios');
  const selectCategoria = document.getElementById('categoria');
  const selectMusculo   = document.getElementById('musculo');
  const chkFavoritos    = document.getElementById('favoritos');

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

  /**
   * Carrega e renderiza exercícios, aplicando:
   *  - filtro de categoria
   *  - filtro de músculo
   *  - (opcional) filtro de favoritos
   */
  async function carregarExercicios(categoriaId = 0, musculoId = 0, somenteFavoritos = false) {
    const res = await fetch('https://wger.de/api/v2/exerciseinfo/?status=2&limit=60');
    const dados = await res.json();

    lista.innerHTML = '';

    let filtrados = dados.results.filter(ex => {
      const matchCategoria = categoriaId === 0 || ex.category.id === categoriaId;

      let matchMusculo = true;
      if (musculoId !== 0) {
        const musculosIds = [
          ...(ex.muscles || []),
          ...(ex.muscles_secondary || [])
        ].map(m => m.id);
        matchMusculo = musculosIds.includes(musculoId);
      }

      return matchCategoria && matchMusculo;
    });

    if (somenteFavoritos) {
      const favs = getFavorites();
      filtrados = filtrados.filter(ex => favs.includes(ex.id));
    }

    if (filtrados.length === 0) {
      lista.innerHTML = somenteFavoritos
        ? 'Nenhum favorito encontrado com esses filtros.'
        : 'No exercises found with selected filters.';
      return;
    }

    filtrados.forEach(ex => {
      const translation = ex.translations.find(t => t.language === 2) || ex.translations[0];
      const nome      = translation?.name || 'No name available.';
      const descricao = translation?.description?.trim() || 'No description available.';

      const div = document.createElement('div');
      div.className = 'exercicio';

      // botão de favorito
      const favoritoHTML = `
        <button class="fav-btn" data-id="${ex.id}" title="Favoritar">
          ${isFavorite(ex.id) ? '★' : '☆'}
        </button>
      `;

      let imagensHTML = '';
      if (ex.images?.length) {
        imagensHTML = `<img src="${ex.images[0].image}" alt="${nome}" />`;
      }

      div.innerHTML = `
        <div class="exercicio-header">
          <h3>${nome}</h3>
          ${favoritoHTML}
        </div>
        ${imagensHTML}
        <p>${descricao}</p>
      `;
      lista.appendChild(div);
    });

    // listeners de favorito
    lista.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        toggleFavorite(id);
      });
    });
  }

  // dispara o reload dos exercícios com todos os filtros
  function atualizarExercicios() {
    const categoriaId    = parseInt(selectCategoria.value);
    const musculoId      = parseInt(selectMusculo.value);
    const somenteFavoritos = chkFavoritos.checked;
    carregarExercicios(categoriaId, musculoId, somenteFavoritos)
      .then(loadFavoritesUI);
  }

  // listeners
  selectCategoria.addEventListener('change', atualizarExercicios);
  selectMusculo.addEventListener('change', atualizarExercicios);
  chkFavoritos.addEventListener('change', atualizarExercicios);

  // inicialização
  carregarCategorias();
  carregarMusculos();
  carregarExercicios()
    .then(loadFavoritesUI);
});
