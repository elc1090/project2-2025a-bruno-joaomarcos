document.addEventListener("DOMContentLoaded", () => {
  const lista = document.getElementById('lista-exercicios');
  const selectCategoria = document.getElementById('categoria');
  const selectMusculo = document.getElementById('musculo');
  const grupoLista = document.getElementById('grupo-exercicios');
  const saveBtn = document.getElementById('save-training');

  // Limites
  const MAX_TRAINING = 10;
  const ITEMS_PER_PAGE = 10;

  // Mapa de exercícios selecionados: id -> nome
  let selectedExercises = new Map();
  let currentFilteredExercises = [];
  let currentPage = 1;

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

  async function carregarExercicios(categoriaId = 0, musculoId = 0) {
    const res = await fetch('https://wger.de/api/v2/exerciseinfo/?status=2&limit=1000');
    const dados = await res.json();
    currentFilteredExercises = dados.results.filter(ex => {
      const matchCategoria = categoriaId === 0 || ex.category.id === categoriaId;
      let matchMusculo = true;
      if (musculoId !== 0) {
        const ids = [...(ex.muscles || []), ...(ex.muscles_secondary || [])].map(m => m.id);
        matchMus = ids.includes(musculoId);
      }
      return matchCategoria && matchMusculo;
    });
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
      alert(`Você só pode adicionar até ${MAX_TRAINING} exercícios.`);
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

  selectCategoria.addEventListener('change', () => carregarExercicios(+selectCategoria.value, +selectMusculo.value));
  selectMusculo.addEventListener('change', () => carregarExercicios(+selectCategoria.value, +selectMusculo.value));

  carregarCategorias();
  carregarMusculos();
  carregarExercicios();
  updateCounter();
});
