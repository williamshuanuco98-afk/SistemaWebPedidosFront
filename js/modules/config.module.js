export function renderConfigView(clientsCount = 0, productsCount = 0) {
  const bdClients = document.getElementById('bdClientsCount');
  const bdProducts = document.getElementById('bdProductsCount');

  if (bdClients) bdClients.textContent = `${clientsCount} Clientes`;
  if (bdProducts) bdProducts.textContent = `${productsCount} Productos`;
}
