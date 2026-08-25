const hex = (value) => `#${value.toString(16).padStart(6, '0')}`;

export class UIService {
  constructor(root, onParent, onBreed) {
    this.parentIds = [];
    this.onParent = onParent;
    this.onBreed = onBreed;
    this.root = document.createElement('div');
    this.root.style.cssText = 'position:absolute;inset:0;pointer-events:none;color:#eefcff;';
    this.root.innerHTML = `
      <div style="position:absolute;left:20px;top:18px;text-shadow:0 2px 12px #001b24;">
        <div style="font-size:28px;font-weight:800;letter-spacing:-.04em">Little Reef</div>
        <div style="font-size:13px;opacity:.78">Select two fish and breed a new generation.</div>
        <div data-goal style="margin-top:10px;font-size:12px;color:#baf3dc"></div>
      </div>
      <section data-panel style="display:none;position:absolute;right:18px;top:18px;width:250px;padding:16px;border:1px solid #ffffff24;border-radius:18px;background:#062b38d9;backdrop-filter:blur(12px);pointer-events:auto;box-shadow:0 18px 50px #00131c55"></section>
      <section style="position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:18px;background:#062b38d9;border:1px solid #ffffff24;pointer-events:auto;backdrop-filter:blur(12px)">
        <span data-parents style="font-size:13px;min-width:190px">Parents: none selected</span>
        <button data-breed disabled style="border:0;border-radius:12px;padding:10px 15px;font-weight:750;background:#8de0c1;color:#073229;cursor:pointer">Breed</button>
      </section>`;
    root.appendChild(this.root);
    this.panel = this.root.querySelector('[data-panel]');
    this.parents = this.root.querySelector('[data-parents]');
    this.breedButton = this.root.querySelector('[data-breed]');
    this.goalText = this.root.querySelector('[data-goal]');
    this.breedButton.addEventListener('click', () => this.onBreed([...this.parentIds]));
  }

  updateGameState(gameState) {
    const active = gameState.goals.find((item) => !item.complete);
    this.goalText.textContent = active
      ? `Goal: ${active.label} (${active.current}/${active.target}) · ${gameState.state.replace('-', ' ')}`
      : `All reef goals complete · ${gameState.state.replace('-', ' ')}`;
  }

  showFish(fish) {
    this.panel.style.display = 'block';
    this.panel.innerHTML = `
      <div style="font-weight:800;font-size:18px">${fish.name}</div>
      <div style="opacity:.66;font-size:12px;margin:2px 0 12px">Generation ${fish.generation}${fish.parents.length ? ` · ${fish.parents.join(' × ')}` : ''}</div>
      ${this.#row('Body', fish.traits.body)}
      ${this.#row('Color', `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${hex(fish.traits.baseColor)}"></span> ${hex(fish.traits.baseColor)}`)}
      ${this.#row('Pattern', fish.traits.pattern)}
      ${this.#row('Tail', fish.traits.tail)}
      <button data-parent style="margin-top:14px;width:100%;border:0;border-radius:12px;padding:10px;background:#d6f4ec;color:#073229;font-weight:750;cursor:pointer">Use as parent</button>`;
    this.panel.querySelector('[data-parent]').addEventListener('click', () => this.addParent(fish.id));
  }

  addParent(id) {
    if (this.parentIds.includes(id)) return;
    if (this.parentIds.length === 2) this.parentIds.shift();
    this.parentIds.push(id);
    this.parents.textContent = `Parents: ${this.parentIds.join(' + ')}`;
    this.breedButton.disabled = this.parentIds.length !== 2;
    this.breedButton.style.opacity = this.parentIds.length === 2 ? '1' : '.45';
    this.onParent(this.parentIds);
  }

  resetParents() {
    this.parentIds = [];
    this.parents.textContent = 'Parents: none selected';
    this.breedButton.disabled = true;
    this.breedButton.style.opacity = '.45';
  }

  #row(label, value) {
    return `<div style="display:flex;justify-content:space-between;gap:14px;padding:5px 0;font-size:13px"><span style="opacity:.62">${label}</span><span style="text-align:right;text-transform:capitalize">${value}</span></div>`;
  }
}
