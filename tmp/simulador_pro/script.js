document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const btnCalculate = document.getElementById('btn-calculate');
    const btnText = document.getElementById('btn-text');
    const btnIcon = document.getElementById('btn-icon');
    const resultContainer = document.getElementById('result-container');
    const cepInput = document.getElementById('cep-input');
    const bikeValueInput = document.getElementById('bike-value');
    const cityDisplay = document.getElementById('cidade-display');
    const ufDisplay = document.getElementById('uf-display');
    const volumeCards = document.querySelectorAll('.volume-card');
    
    // State
    let freteData = [];
    let selectedRoute = null;
    let currentVolumeType = 'quadro'; // Default

    // --- DATA LOADING ---
    async function initData() {
        try {
            // Fetching from the actual public folder (assuming served from root)
            const response = await fetch('../../public/frete_rodonaves.json');
            if (!response.ok) throw new Error('Falha ao carregar base de frete');
            freteData = await response.json();
            console.log('📦 Base Rodonaves Carregada:', freteData.length, 'registros');
        } catch (err) {
            console.error('❌ Erro Crítico:', err);
            alert('Erro ao carregar banco de dados de frete. Verifique o console.');
        }
    }
    initData();

    // --- MASKING & FORMATTING ---
    cepInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5, 8);
        e.target.value = val;

        if (val.replace('-', '').length === 8) {
            searchByCep(val.replace('-', ''));
        }
    });

    bikeValueInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        val = (val / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        e.target.value = val;
    });

    // --- SEARCH LOGIC ---
    function searchByCep(cepStr) {
        const cep = parseInt(cepStr);
        const cepLoader = document.getElementById('cep-loader');
        if (cepLoader) cepLoader.classList.add('active');

        // Linear search inside the JSON (best for local small-medium datasets)
        const found = freteData.find(item => 
            cep >= parseInt(item.cep_ini) && cep <= parseInt(item.cep_fim)
        );

        setTimeout(() => {
            if (found) {
                selectedRoute = found;
                cityDisplay.value = found.cidade.toUpperCase();
                ufDisplay.value = found.uf.toUpperCase();
            } else {
                selectedRoute = null;
                cityDisplay.value = 'NÃO ENCONTRADO';
                ufDisplay.value = '??';
            }
            if (cepLoader) cepLoader.classList.remove('active');
        }, 300);
    }

    // Handle Volume Card Selection
    volumeCards.forEach(card => {
        card.addEventListener('click', () => {
            volumeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            currentVolumeType = card.dataset.type;
        });
    });

    // --- CALCULATION ENGINE ---
    btnCalculate.addEventListener('click', async () => {
        if (!selectedRoute) {
            alert('Por favor, insira um CEP válido primeiro.');
            return;
        }

        const bikeValue = parseFloat(bikeValueInput.value.replace(/\D/g, '')) / 100;
        if (isNaN(bikeValue) || bikeValue <= 0) {
            alert('Insira o valor da bike.');
            return;
        }

        // 1. Loading UI
        btnCalculate.disabled = true;
        btnIcon.innerHTML = '<div class="spinner"></div>';
        btnText.innerText = 'CALCULANDO...';
        resultContainer.classList.add('hidden');

        await new Promise(r => setTimeout(r, 800));

        // 2. Calculation Logic (Based on your business rules)
        // Weight: Quadro (6kg) or Bike (15.5kg). Calculation always uses Cubage (38.48kg)
        const pesoCalculo = 38.48; 
        
        // Find correct Bracket (peso40 because 38.48 is in [21, 40])
        let fretePeso = selectedRoute.peso40 || selectedRoute.peso60 || selectedRoute.peso100 || 0;
        
        // Taxes
        const gris = Math.max(selectedRoute.gris_min || 0, (bikeValue * (selectedRoute.gris_pct || 0)) / 100);
        const tas = selectedRoute.tas || 0;
        const pedagio = selectedRoute.pedagio_fixo || 0;

        const subtotal = fretePeso + gris + tas + pedagio;
        
        // Your Custom Rounding Rule: ceil((subtotal + 30) / 5) * 5
        const totalFinal = Math.ceil((subtotal + 30) / 5) * 5;

        // 3. Update UI
        document.getElementById('res-location').innerText = `${selectedRoute.cidade.toUpperCase()} — ${selectedRoute.uf.toUpperCase()}`;
        document.getElementById('res-prazo').innerText = (parseInt(selectedRoute.prazo) + 2).toString();
        document.getElementById('res-frete-peso').innerText = `R$ ${fretePeso.toFixed(2).replace('.', ',')}`;
        document.getElementById('res-gris').innerText = `R$ ${gris.toFixed(2).replace('.', ',')}`;
        document.getElementById('res-tas').innerText = `R$ ${tas.toFixed(2).replace('.', ',')}`;
        document.getElementById('res-pedagio').innerText = `R$ ${pedagio.toFixed(2).replace('.', ',')}`;
        document.getElementById('res-total').innerText = totalFinal.toLocaleString('pt-BR');
        document.getElementById('res-subtotal').innerText = `Subtotal Real: R$ ${subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        // 4. Show Result
        btnCalculate.disabled = false;
        btnIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="14"></line><line x1="16" y1="18" x2="16" y2="18"></line><line x1="12" y1="14" x2="12" y2="14"></line><line x1="12" y1="18" x2="12" y2="18"></line><line x1="8" y1="14" x2="8" y2="14"></line><line x1="8" y1="18" x2="8" y2="18"></line></svg>`;
        btnText.innerText = 'CALCULAR FRETE OFICIAL';
        resultContainer.classList.remove('hidden');
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    });
});
