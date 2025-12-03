// ==============================================================================
// EXEMPLO DE CONFIGURAÇÃO DO SISTEMA DE ENTREGA
// ==============================================================================
// Copie este arquivo para delivery.config.js e ajuste os valores
// ==============================================================================

export const deliveryConfig = {
  // Coordenadas do restaurante (obtenha no Google Maps)
  restaurantCoordinates: {
    lat: -25.4284, // Latitude do restaurante
    lng: -49.2733  // Longitude do restaurante
  },
  
  // Regras de precificação por distância (em quilômetros)
  // O sistema seleciona a primeira regra que corresponde à distância máxima
  // Ajuste de acordo com sua política de entrega
  pricingRules: [
    { maxDistance: 2, price: 5.00 },     // Até 2km: R$ 5,00
    { maxDistance: 4, price: 7.00 },     // Até 4km: R$ 7,00
    { maxDistance: 6, price: 10.00 },    // Até 6km: R$ 10,00
    { maxDistance: 10, price: 15.00 },   // Até 10km: R$ 15,00
    { maxDistance: 20, price: 25.00 }    // Até 20km: R$ 25,00
  ],
  
  // Área máxima de entrega em km
  maxDeliveryDistance: 20,
  
  // Mensagem quando fora da área de entrega
  outOfRangeMessage: "Desculpe, mas você está fora da nossa área de entrega (máximo de 20km)."
};
