document.addEventListener("DOMContentLoaded", () => {
    const lista = document.getElementById('lista-exercicios');
    const selectCategoria = document.getElementById('categoria');
    const selectMusculo = document.getElementById('musculo');
  
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
        // carregando um limite de 60 infos de exercicios por enquanto apenas
      const res = await fetch('https://wger.de/api/v2/exerciseinfo/?status=2&limit=60');
      const dados = await res.json();
      console.log("Exercicios recebidos:", dados);
  
      lista.innerHTML = '';
  
      const filtrados = dados.results.filter(ex => {
        const matchCategoria = categoriaId == 0 || ex.category.id == categoriaId;
  
        let matchMusculo = true;
        if (musculoId != 0) {
          const musculosIds = [...(ex.muscles || []), ...(ex.muscles_secondary || [])].map(m => m.id);
          matchMusculo = musculosIds.includes(musculoId);
        }
  
        return matchCategoria && matchMusculo;
      });
  
      if (filtrados.length === 0) {
        lista.innerHTML = 'No exercises found with selected filters.';
        return;
      }
  
      filtrados.forEach(ex => {
        const translation = ex.translations.find(t => t.language === 2) || ex.translations[0];
        const nome = translation?.name || 'No name available.';
        const descricao = translation?.description?.trim() || 'No description available.';
  
        const div = document.createElement('div');
        div.className = 'exercicio';
  
        let imagensHTML = '';
        if (ex.images?.length) {
          imagensHTML = `<img src="${ex.images[0].image}" alt="${nome}" />`;
        }
  
        div.innerHTML = `
          ${imagensHTML}
          <h3>${nome}</h3>
          <p>${descricao}</p>
        `;
        lista.appendChild(div);
      });
    }
  
    function atualizarExercicios() {
      const categoriaId = parseInt(selectCategoria.value);
      const musculoId = parseInt(selectMusculo.value);
      carregarExercicios(categoriaId, musculoId);
    }
  
    selectCategoria.addEventListener('change', atualizarExercicios);
    selectMusculo.addEventListener('change', atualizarExercicios);
  
    carregarCategorias();
    carregarMusculos();
    carregarExercicios();
  });
  