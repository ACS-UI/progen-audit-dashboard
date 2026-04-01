export default async function decorate(block) {
  console.log('Decorating cards block', block);
  block.classList.add('cmp-card');
}
