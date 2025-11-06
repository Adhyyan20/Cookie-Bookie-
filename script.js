// Storage key for local persistence
const STORAGE_KEY = 'cookieBookieRecipes.v1';

// In-memory state
let recipes = [];
let editingId = null;

// DOM refs
const form = document.getElementById('recipeForm');
const rid = document.getElementById('rid');
const titleEl = document.getElementById('title');
const imageEl = document.getElementById('image');
const ingEl = document.getElementById('ingredients');
const stepsEl = document.getElementById('steps');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const formTitle = document.getElementById('formTitle');
const formStatus = document.getElementById('formStatus');

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const countLabel = document.getElementById('countLabel');

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');

const seedBtn = document.getElementById('seedBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

const toastEl = document.getElementById('toast');

// Utilities
const uid = () => String(Date.now()) + Math.random().toString(36).slice(2, 8);
const nowISO = () => new Date().toISOString();

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
const load = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1800);
}

// Render list with optional query filter
function render(q = '') {
    const query = q.trim().toLowerCase();
    let data = recipes.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (query) {
        data = data.filter(r =>
            r.title.toLowerCase().includes(query) ||
            r.ingredients.toLowerCase().includes(query)
        );
    }

    countLabel.textContent = `${data.length} ${data.length === 1 ? 'recipe' : 'recipes'}`;
    listEl.innerHTML = '';
    if (data.length === 0) {
        emptyEl.style.display = 'block';
        return;
    }
    emptyEl.style.display = 'none';

    const frag = document.createDocumentFragment();
    for (const r of data) {
        const card = document.createElement('article');
        card.className = 'card';
        card.dataset.id = r.id;

        const thumb = document.createElement('div');
        if (r.image) {
            thumb.className = 'thumb img';
            const img = document.createElement('img');
            img.src = r.image;
            img.alt = r.title;
            img.referrerPolicy = 'no-referrer';
            img.onerror = () => { thumb.className = 'thumb'; thumb.textContent = '🍪'; };
            thumb.appendChild(img);
        } else {
            thumb.className = 'thumb';
            thumb.textContent = '🍪';
        }

        const content = document.createElement('div');
        content.className = 'content';

        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = r.title;

        const meta = document.createElement('div');
        meta.className = 'meta';
        const updated = new Date(r.updatedAt);
        meta.textContent = `Updated ${updated.toLocaleString()}`;

        const ing = document.createElement('div');
        ing.className = 'ing';
        ing.textContent = r.ingredients;

        const steps = document.createElement('div');
        steps.className = 'steps';
        steps.textContent = r.steps;

        const actions = document.createElement('div');
        actions.className = 'row-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'btn success';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => beginEdit(r.id));

        const delBtn = document.createElement('button');
        delBtn.className = 'btn danger';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => removeRecipe(r.id));

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        content.appendChild(title);
        content.appendChild(meta);
        content.appendChild(ing);
        content.appendChild(steps);

        card.appendChild(thumb);
        card.appendChild(content);
        card.appendChild(actions);

        frag.appendChild(card);
    }
    listEl.appendChild(frag);
}

// CRUD
function addRecipe(payload) {
    const r = {
        id: uid(),
        title: payload.title.trim(),
        image: payload.image.trim(),
        ingredients: normalizeMulti(payload.ingredients),
        steps: normalizeMulti(payload.steps),
        createdAt: nowISO(),
        updatedAt: nowISO()
    };
    recipes.push(r);
    save();
    render(searchInput.value);
    showToast('Recipe added');
}

function updateRecipe(id, payload) {
    const i = recipes.findIndex(x => x.id === id);
    if (i === -1) return;
    recipes[i] = {
        ...recipes[i],
        title: payload.title.trim(),
        image: payload.image.trim(),
        ingredients: normalizeMulti(payload.ingredients),
        steps: normalizeMulti(payload.steps),
        updatedAt: nowISO()
    };
    save();
    render(searchInput.value);
    showToast('Recipe updated');
}

function removeRecipe(id) {
    const r = recipes.find(x => x.id === id);
    if (!r) return;
    const ok = confirm(`Delete "${r.title}"? This cannot be undone.`);
    if (!ok) return;
    recipes = recipes.filter(x => x.id !== id);
    save();
    if (editingId === id) resetForm();
    render(searchInput.value);
    showToast('Recipe deleted');
}

function clearAll() {
    const ok = confirm('Clear ALL recipes? This cannot be undone.');
    if (!ok) return;
    recipes = [];
    save();
    resetForm();
    render(searchInput.value);
    showToast('All recipes cleared');
}

// Form helpers
function beginEdit(id) {
    const r = recipes.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    rid.value = id;
    titleEl.value = r.title;
    imageEl.value = r.image || '';
    ingEl.value = r.ingredients;
    stepsEl.value = r.steps;

    formTitle.textContent = 'Edit Recipe';
    submitBtn.textContent = 'Update Recipe';
    submitBtn.classList.remove('primary');
    submitBtn.classList.add('success');
    cancelEditBtn.style.display = 'inline-block';
    formStatus.textContent = 'Editing…';
}

function resetForm() {
    editingId = null;
    rid.value = '';
    form.reset();
    formTitle.textContent = 'Add New Recipe';
    submitBtn.textContent = 'Add Recipe';
    submitBtn.classList.remove('success');
    submitBtn.classList.add('primary');
    cancelEditBtn.style.display = 'none';
    formStatus.textContent = '';
}

function normalizeMulti(text) {
    // Accepts lines or comma-separated and normalizes to neat multi-line text
    const raw = text.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
    return raw.join('\n');
}

function validate() {
    const t = titleEl.value.trim();
    const i = ingEl.value.trim();
    const s = stepsEl.value.trim();
    if (!t) return 'Title is required.';
    if (t.length < 3) return 'Title should be at least 3 characters.';
    if (!i) return 'Ingredients are required.';
    if (!s) return 'Steps are required.';
    if (imageEl.value.trim()) {
        try {
            const u = new URL(imageEl.value.trim());
            const ok = /^(https?:)/.test(u.protocol);
            if (!ok) return 'Image URL must start with http or https.';
        } catch {
            return 'Please provide a valid image URL or leave it blank.';
        }
    }
    return '';
}

// Seed examples for quick demo
function seedExamples() {
    const demo = [
        {
            id: uid(),
            title: 'Chewy Choco Chip Cookies',
            image: '',
            ingredients: normalizeMulti('All-purpose flour\nBrown sugar\nButter\nChocolate chips\nBaking soda\nEggs\nVanilla\nSalt'),
            steps: normalizeMulti('Cream butter & sugar\nAdd eggs & vanilla\nFold in dry mix\nStir in chips\nScoop & bake at 175°C for 10–12 min'),
            createdAt: nowISO(),
            updatedAt: nowISO()
        },
        {
            id: uid(),
            title: 'Oatmeal Raisin Cookies',
            image: '',
            ingredients: normalizeMulti('Rolled oats\nFlour\nButter\nBrown sugar\nCinnamon\nEgg\nRaisins\nBaking powder\nSalt'),
            steps: normalizeMulti('Whisk dry\nCream wet\nCombine & fold raisins\nChill 20 min\nBake at 180°C for 12–14 min'),
            createdAt: nowISO(),
            updatedAt: nowISO()
        }
    ];
    recipes = recipes.concat(demo);
    save();
    render(searchInput.value);
    showToast('Sample recipes added');
}

// Events
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { formStatus.textContent = err; showToast(err); return; }
    const payload = {
        title: titleEl.value,
        image: imageEl.value || '',
        ingredients: ingEl.value,
        steps: stepsEl.value
    };
    if (editingId) {
        updateRecipe(editingId, payload);
    } else {
        addRecipe(payload);
    }
    resetForm();
});

cancelEditBtn.addEventListener('click', resetForm);

searchInput.addEventListener('input', (e) => render(e.target.value));
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    render('');
    searchInput.focus();
});

seedBtn.addEventListener('click', seedExamples);
clearAllBtn.addEventListener('click', clearAll);

// Init
(function init() {
    recipes = load();
    render('');
})();