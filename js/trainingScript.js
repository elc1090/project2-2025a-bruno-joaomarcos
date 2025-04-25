document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'grupos_treino_salvos';
    const FAVORITES_KEY = 'wger_favorites';
    const mainView = document.getElementById('main-view');
    const editorView = document.getElementById('editor-view');
    const listContainer = document.getElementById('trainings-list');
    const deleteBtn = document.getElementById('delete-selected');
    const editorTitle = document.getElementById('editor-title');
    const editFav = document.getElementById('edit-favoritos');
    const editCat = document.getElementById('edit-categoria');
    const editMus = document.getElementById('edit-musculo');
    const listaEdit = document.getElementById('lista-exercicios-edit');
    const pagEdit = document.getElementById('pagination-edit');
    const grpList = document.getElementById('grupo-edit-list');
    const saveEdit = document.getElementById('save-edit');
    const cancelEdit = document.getElementById('cancel-edit');

    let grupos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    let editingGroup = null;
    let selectedMap = new Map();
    let exercises = [];
    let filtered = [];
    let page = 1;
    const PER_PAGE = 10;
    const MAX_TRAINING = 10;

    // Helpers
    function getFavorites() {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    }
    function saveGrupos() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(grupos));
    }

    // Render main list
    function renderMain() {
      listContainer.innerHTML = '';
      if (!grupos.length) {
        listContainer.textContent = 'No trainings found.';
        deleteBtn.disabled = true;
        return;
      }
      grupos.forEach(g => {
        const panel = document.createElement('div');
        panel.className = 'panel panel-default';
        panel.dataset.id = g.id;
        panel.innerHTML = `
          <div class="panel-heading clearfix">
            <input type="checkbox" class="select-chk" data-id="${g.id}"> <strong>${g.nome}</strong>
            <button class="btn btn-xs btn-primary pull-right edit-btn">Edit</button>
            <button class="btn btn-xs btn-danger pull-right delete-btn" style="margin-right:5px;">Delete</button>
          </div>
          <div class="panel-body"><ul class="list-group">
            ${g.exercicios.map(ex => `<li class="list-group-item">${ex.nome}</li>`).join('')}
          </ul></div>`;
        listContainer.appendChild(panel);
      });
      deleteBtn.disabled = !document.querySelector('.select-chk:checked');
    }

    // Load categories and muscles
    async function carregarCategorias() {
      editCat.innerHTML = '<option value="0">All</option>';
      const res = await fetch('https://wger.de/api/v2/exercisecategory/');
      const data = await res.json();
      data.results.forEach(c => {
        const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name;
        editCat.appendChild(opt);
      });
    }
    async function carregarMusculos() {
      editMus.innerHTML = '<option value="0">All</option>';
      const res = await fetch('https://wger.de/api/v2/muscle/');
      const data = await res.json();
      data.results.forEach(m => {
        const opt = document.createElement('option'); opt.value = m.id; opt.textContent = m.name;
        editMus.appendChild(opt);
      });
    }

    // Apply filters
    function applyFilters() {
      const fav = editFav.checked;
      const cat = +editCat.value;
      const mus = +editMus.value;
      const favs = getFavorites();
      filtered = exercises.filter(ex => {
        if (cat && ex.category.id !== cat) return false;
        if (mus) {
          const ids = [...ex.muscles.map(m => m.id), ...ex.muscles_secondary.map(m => m.id)];
          if (!ids.includes(mus)) return false;
        }
        if (fav && !favs.includes(ex.id)) return false;
        return true;
      });
      page = 1;
    }

    // Render editor page
    function renderEditor() {
      listaEdit.innerHTML = '';
      const start = (page - 1) * PER_PAGE;
      filtered.slice(start, start + PER_PAGE).forEach(ex => {
        const tr = ex.translations.find(t => t.language === 2) || ex.translations[0];
        const nome = tr.name || 'No name';
        const selected = selectedMap.has(ex.id);
        const div = document.createElement('div'); div.className = 'exercicio';
        const span = document.createElement('span'); span.className = 'nome-ex'; span.textContent = nome;
        const btn = document.createElement('button');
        btn.className = `btn btn-xs ${selected ? 'btn-danger btn-remove-edit' : 'btn-success btn-add-edit'}`;
        btn.dataset.id = ex.id; btn.textContent = selected ? 'Remove' : 'Add';
        div.appendChild(span); div.appendChild(btn);
        listaEdit.appendChild(div);
      });
      renderEditorPagination();
    }

    function renderEditorPagination() {
      pagEdit.innerHTML = '';
      const total = Math.ceil(filtered.length / PER_PAGE);
      if (total < 2) return;
      const prev = document.createElement('button'); prev.textContent = '◀';
      const next = document.createElement('button'); next.textContent = '▶';
      prev.className = next.className = 'btn btn-default btn-sm';
      prev.disabled = page === 1; next.disabled = page === total;
      prev.onclick = () => { page--; renderEditor(); };
      next.onclick = () => { page++; renderEditor(); };
      const span = document.createElement('span'); span.textContent = ` ${page}/${total} `;
      pagEdit.append(prev, span, next);
    }

    // Update group list in editor
    function updateGroupList() {
      grpList.innerHTML = '';
      selectedMap.forEach((nome, id) => {
        const li = document.createElement('li'); li.className = 'list-group-item'; li.textContent = nome;
        grpList.appendChild(li);
      });
    }

    // Initialize editor for a group
    async function initEditor(group) {
      editingGroup = group;
      selectedMap = new Map(group.exercicios.map(ex => [ex.id, ex.nome]));
      editorTitle.textContent = `Editando: ${group.nome}`;
      mainView.style.display = 'none'; editorView.style.display = '';
      exercises = (await fetch('https://wger.de/api/v2/exerciseinfo/?status=2&limit=1000').then(r => r.json())).results;
      await carregarCategorias(); await carregarMusculos();
      editFav.checked = false; editCat.value = 0; editMus.value = 0;
      applyFilters(); renderEditor(); updateGroupList();
    }

    // Event bindings
    // Filter changes
    [editFav, editCat, editMus].forEach(el => el.addEventListener('change', () => { applyFilters(); renderEditor(); }));
    // Add/Remove buttons in editor
    listaEdit.addEventListener('click', e => {
      if (e.target.matches('.btn-add-edit')) {
        const id = +e.target.dataset.id;
        const nome = e.target.parentNode.querySelector('.nome-ex').textContent;
        if (selectedMap.size < MAX_TRAINING) selectedMap.set(id, nome);
        renderEditor(); updateGroupList();
      } else if (e.target.matches('.btn-remove-edit')) {
        const id = +e.target.dataset.id; selectedMap.delete(id);
        renderEditor(); updateGroupList();
      }
    });
    // Save/cancel
    saveEdit.addEventListener('click', () => {
      editingGroup.exercicios = Array.from(selectedMap.entries()).map(([id, nome]) => ({ id, nome }));
      saveGrupos(); renderMain(); editorView.style.display = 'none'; mainView.style.display = '';
    });
    cancelEdit.addEventListener('click', () => { editorView.style.display = 'none'; mainView.style.display = ''; });
    // Main list actions
    listContainer.addEventListener('click', e => {
      const panel = e.target.closest('.panel'); if (!panel) return;
      const id = +panel.dataset.id;
      if (e.target.matches('.edit-btn')) initEditor(grupos.find(g => g.id === id));
      if (e.target.matches('.delete-btn')) { grupos = grupos.filter(g => g.id !== id); saveGrupos(); renderMain(); }
    });
    listContainer.addEventListener('change', e => { if (e.target.matches('.select-chk')) deleteBtn.disabled = !document.querySelector('.select-chk:checked'); });
    deleteBtn.addEventListener('click', () => {
      const ids = Array.from(document.querySelectorAll('.select-chk:checked')).map(c => +c.dataset.id);
      if (ids.length && confirm(`Remove ${ids.length} trainings?`)) { grupos = grupos.filter(g => !ids.includes(g.id)); saveGrupos(); renderMain(); }
    });

    // Initial render
    renderMain();
  });