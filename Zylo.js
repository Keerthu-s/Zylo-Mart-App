let products = [];
    let display = [];
    let cart = JSON.parse(localStorage.getItem('zylo_cart') || '[]');

    /* ---------------- Helpers ---------------- */
    const $ = id => document.getElementById(id);
    function money(n){ return '₹' + parseFloat(n).toFixed(2); }

    /* ---------------- Fetch products ---------------- */
    fetch('https://fakestoreapi.com/products')
      .then(r => r.json())
      .then(data => {
        // attach a random condition (2..5) and small random discount for demo
        products = data.map(p => ({...p, cond: Math.floor(Math.random()*3)+2}));
        display = [...products];
        initCategories();
        renderGrid(display);
        renderQuickPicks();
        restoreCartUI();
      })
      .catch(err => {
        $('grid').innerHTML = '<div style="padding:18px;color:var(--muted)">Failed to load products.</div>';
        console.error(err);
      });

    /* ---------------- UI renderers ---------------- */
    function renderGrid(list){
      const grid = $('grid');
      grid.innerHTML = '';
      $('count').innerText = list.length;
      list.forEach((p, idx) => {
        const card = document.createElement('article');
        card.className = 'product';
        card.innerHTML = `
          <div class="media" style="background-image:url('${p.image}')"></div>
          <div class="p-title">${escapeHtml(p.title)}</div>
          <div class="row">
            <div>
              <div class="price">${money(calcDiscounted(p))}</div>
              <div class="old">${money(p.price)}</div>
            </div>
            <div class="discount-badge">-${p._discount || 0}%</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
            <button class="btn" onclick="openModal(${idx})">View</button>
            <button class="btn ghost" onclick="addToCartIndex(${idx})">Add</button>
          </div>`;
        grid.appendChild(card);
      });
    }
        /*for(let p of products) {
        let i = document.createElement("grid");
        i.classList.toggle("product");
        let value = ["Brand New", "Lightly Used", "Like New", "Well Used"];
        let rindex = Math.round(Math.random()*3);
        products.setAttribute("title", value[rindex]);}*/
    
    function renderQuickPicks(){
      const qdiv = document.getElementById('quickCats');
      qdiv.innerHTML = '';
      const cats = [...new Set(products.map(p=>p.category))].slice(0,6);
      cats.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'category';
        el.innerText = capitalize(cat);
        el.onclick = ()=> { filterByCategory(cat); window.scrollTo({top:200, behavior:'smooth'}); }
        qdiv.appendChild(el);
      });
    }

    function restoreCartUI(){
      updateCartCount();
    }

    function updateCartCount(){
      $('cartCount').innerText = cart.reduce((s,i)=>s+i.qty,0);
      renderCartDrawer();
    }

    function renderCartDrawer(){
      const items = $('cartItems');
      items.innerHTML = '';
      let total = 0;
      cart.forEach((c, i) => {
        const p = products.find(x => x.id === c.id) || {};
        const line = document.createElement('div');
        line.className = 'cart-item';
        line.innerHTML = `<img src="${p.image}" alt=""><div style="flex:1"><div style="font-weight:600">${escapeHtml(p.title)}</div><div style="color:var(--muted)">${money(c.price)}</div></div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <input type="number" min="1" value="${c.qty}" style="width:60px;padding:6px;border-radius:6px;border:1px solid #eef3ff" onchange="changeQty(${i}, this.value)">
            <button style="background:transparent;border:0;color:#d00;cursor:pointer" onclick="removeCart(${i})">Remove</button>
          </div>`;
        items.appendChild(line);
        total += c.price * c.qty;
      });
      $('cartTotal').innerText = money(total);
      localStorage.setItem('zylo_cart', JSON.stringify(cart));
    }

    function changeQty(i, v){
      const val = Math.max(1, parseInt(v) || 1);
      cart[i].qty = val;
      updateCartCount();
    }
    function removeCart(i){
      cart.splice(i,1);
      updateCartCount();
    }

    function addToCartItem(item, qty=1){
      const existing = cart.find(c => c.id === item.id);
      if(existing) existing.qty += qty;
      else cart.push({id:item.id, price: parseFloat(calcDiscounted(item)), qty});
      updateCartCount();
      alert('Added to cart');
    }

    function addToCartIndex(idx){
      const it = products[idx];
      addToCartItem(it, 1);
    }

    /* ---------------- Modal logic ---------------- */
    let currentModalItem = null;
    function openModal(idx){
      const p = products[idx];
      currentModalItem = p;
      // calculate discount
      p._discount = Math.round(Math.random()*45);
      $('modalImg').style.backgroundImage = `url('${p.image}')`;
      $('modalTitle').innerText = p.title;
      $('modalCategory').innerText = capitalize(p.category);
      $('modalPrice').innerText = money(calcDiscounted(p));
      $('modalOld').innerText = money(p.price);
      $('modalDesc').innerText = p.description;
      $('modalDiscount').innerText = p._discount ? `-${p._discount}%` : '';
      $('qty').value = 1;
      $('modal').style.display = 'flex';
      $('modal').setAttribute('aria-hidden', 'false');
    }

    $('closeModal').addEventListener('click', ()=>{ $('modal').style.display='none'; $('modal').setAttribute('aria-hidden','true'); });
    $('addToCart').addEventListener('click', ()=> {
      if(!currentModalItem) return;
      const q = Math.max(1, parseInt($('qty').value) || 1);
      addToCartItem(currentModalItem, q);
      $('modal').style.display='none';
    });

    /* ---------------- Filters / sort ---------------- */
    function initCategories(){
      const cats = [...new Set(products.map(p=>p.category))];
      const container = $('catChips');
      container.innerHTML = '<div class="chip active" data-cat="all">All</div>';
      cats.forEach(c => {
        const el = document.createElement('div');
        el.className = 'chip';
        el.innerText = capitalize(c);
        el.dataset.cat = c;
        el.onclick = () => {
          document.querySelectorAll('#catChips .chip').forEach(x=>x.classList.remove('active'));
          el.classList.add('active');
          applyFilters();
        };
        container.appendChild(el);
      });
      // attach chip "All" click behavior
      container.querySelector('.chip[data-cat="all"]').onclick = () => {
        container.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
        container.querySelector('.chip[data-cat="all"]').classList.add('active');
        applyFilters();
      };
    }

    function applyFilters(){
      const q = $('globalSearch').value.trim().toLowerCase();
      const price = $('priceFilter').value;
      const activeCat = document.querySelector('#catChips .chip.active')?.dataset.cat || 'all';
      display = products.filter(p => {
        if(q && !(p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))) return false;
        if(activeCat && activeCat !== 'all' && p.category !== activeCat) return false;
        if(price !== 'all'){
          if(price === '0-199' && p.price >= 200) return false;
          if(price === '200-499' && (p.price < 200 || p.price > 499)) return false;
          if(price === '500-999' && (p.price < 500 || p.price > 999)) return false;
          if(price === '1000+' && p.price < 1000) return false;
        }
        return true;
      });
      sortAndRender();
    }

    function sortAndRender(){
      const s = $('sortBy').value;
      let list = [...display];
      if(s === 'price-asc') list.sort((a,b)=>calcDiscounted(a)-calcDiscounted(b));
      if(s === 'price-desc') list.sort((a,b)=>calcDiscounted(b)-calcDiscounted(a));
      renderGrid(list);
    }

    /* ---------------- Small helpers ---------------- */
    function calcDiscounted(p){
      // attach discount if not attached
      if(!p._discount) p._discount = Math.round(Math.random()*45);
      const dp = p.price - (p.price * p._discount / 100);
      return parseFloat(dp.toFixed(2));
    }
    function escapeHtml(s){
      return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

    /* ---------------- Events ---------------- */
    // global search + sidebar search
    $('globalSearch').addEventListener('input', ()=>applyFilters());
    $('priceFilter').addEventListener('change', applyFilters);
    $('sortBy').addEventListener('change', sortAndRender);
    $('reset').addEventListener('click', ()=>{
      $('globalSearch').value=''; $('priceFilter').value='all';
      document.querySelectorAll('#catChips .chip').forEach(x=>x.classList.remove('active'));
      document.querySelector('#catChips .chip[data-cat="all"]').classList.add('active');
      applyFilters();
    });

    // category quick click for hero
    $('browseBtn').addEventListener('click', ()=>{ window.scrollTo({top:260, behavior:'smooth'}); });
    document.getElementById('sellBtn').addEventListener('click', ()=>{ alert('Sell flow placeholder — add a form for seller onboarding.'); });

    // cart toggles
    $('toggleCart').addEventListener('click', ()=> {
      const c = $('cartDrawer');
      c.style.display = c.style.display === 'block' ? 'none' : 'block';
    });
    $('closeCart').addEventListener('click', ()=> $('cartDrawer').style.display = 'none');
    $('checkoutBtn').addEventListener('click', ()=> alert('Checkout flow placeholder.'));

    // theme toggle
    $('themeBtn').addEventListener('click', ()=>{
      document.body.classList.toggle('dark');
      const ic = $('themeBtn').querySelector('i');
      ic.className = document.body.classList.contains('dark') ? 'fa-solid fa-sun' : 'fa-regular fa-moon';
    });

    // cart behavior helpers
    function addToCartItemExternal(id, qty=1){
      const p = products.find(x=>x.id===id);
      if(p) addToCartItem(p, qty);
    }

    // called from product card to open modal by index
    window.openModal = openModal;
    window.addToCartIndex = addToCartIndex;
    window.changeQty = changeQty;
    window.removeCart = removeCart;

    // small UX: click outside modal to close
    document.getElementById('modal').addEventListener('click', (e)=>{
      if(e.target.id === 'modal') { document.getElementById('modal').style.display = 'none'; }
    });

    // when products loaded, apply initial filters
    // (a short delay might be used when nav param present)
    setTimeout(()=>{ /* no-op initial */ }, 500);
