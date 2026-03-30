async function renderOverallScoreCards(block) {
  // block.innerHTML = '';
  block.classList.add('cmp-overview');
}

export default async function decorate(block) {
  console.log('decorating cards block', block);
  block?.closest('.overview-container')?.classList.add('overview-grid');
  await renderOverallScoreCards(block);
}
