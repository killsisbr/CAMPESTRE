import axios from 'axios';
import { deliveryConfig } from '../config/delivery.config.js';

class DeliveryService {
  constructor() {
    // Coordenadas do restaurante (usar variáveis de ambiente se disponíveis)
    this.restaurantCoordinates = {
      lat: process.env.RESTAURANT_LATITUDE ? parseFloat(process.env.RESTAURANT_LATITUDE) : deliveryConfig.restaurantCoordinates.lat,
      lng: process.env.RESTAURANT_LONGITUDE ? parseFloat(process.env.RESTAURANT_LONGITUDE) : deliveryConfig.restaurantCoordinates.lng
    };
    
    // Chave da API OpenRouteService
    this.orsApiKey = process.env.ORS_API_KEY || '5b3ce3597851110001cf6248cfa0914bbad64af78bc4d5aad8b296fb';
    
    // Regras de precificação
    this.pricingRules = deliveryConfig.pricingRules;
    
    // Distância máxima de entrega
    this.maxDeliveryDistance = deliveryConfig.maxDeliveryDistance;
  }

  // Calcular distância entre duas coordenadas usando OpenRouteService
  async calculateDistance(origin, destination) {
    try {
      // Verificar se as coordenadas são idênticas
      if (origin.lat === destination.lat && origin.lng === destination.lng) {
        return 0; // Distância zero quando as coordenadas são iguais
      }
      
      const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
      const coords = {
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat]
        ]
      };

      const response = await axios.post(url, coords, {
        headers: {
          'Authorization': this.orsApiKey,
          'Content-Type': 'application/json'
        }
      });

      // Verifica se a resposta tem dados de rota válidos
      if (response.data && response.data.routes && response.data.routes[0] && response.data.routes[0].summary) {
        const metros = response.data.routes[0].summary.distance;
        return metros / 1000; // Converte metros para km
      } else {
        throw new Error('Não foi possível calcular a distância');
      }
    } catch (error) {
      console.error('Erro ao calcular distância:', error);
      // Em caso de erro, usar cálculo aproximado
      return this.calculateApproximateDistance(origin, destination);
    }
  }

  // Cálculo aproximado de distância usando fórmula de Haversine
  calculateApproximateDistance(origin, destination) {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRadians(destination.lat - origin.lat);
    const dLon = this.toRadians(destination.lng - origin.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(origin.lat)) * Math.cos(this.toRadians(destination.lat)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  // Converter graus para radianos
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Calcular valor da entrega com base na distância
  calculateDeliveryPrice(distance) {
    // Verificar se está fora da área de entrega
    if (distance > this.maxDeliveryDistance) {
      return {
        distance: distance,
        price: null,
        error: deliveryConfig.outOfRangeMessage
      };
    }
    
    // Encontrar a regra de precificação apropriada
    let price = 0;
    for (const rule of this.pricingRules) {
      if (distance <= rule.maxDistance) {
        price = rule.price;
        break;
      }
    }
    
    return {
      distance: distance,
      price: parseFloat(price.toFixed(2)),
      error: null
    };
  }

  // Verificar se as coordenadas estão em Imbituva
  async verificarSeEstaEmImbituva(lat, lng) {
    try {
      const url = `https://api.openrouteservice.org/geocode/reverse`;
      const response = await axios.get(url, {
        params: {
          api_key: this.orsApiKey,
          'point.lon': lng,
          'point.lat': lat,
          size: 5,
          layers: 'locality,region,county' // Focar em informações de cidade
        }
      });

      if (response.data && response.data.features && response.data.features.length > 0) {
        // Verificar todos os resultados em busca de Imbituva
        for (const feature of response.data.features) {
          const properties = feature.properties;
          const label = properties.label || '';
          const locality = properties.locality || '';
          const county = properties.county || '';
          const region = properties.region || '';
          
          console.log(`Verificando cidade: ${label} (locality: ${locality}, county: ${county})`);
          
          // Verifica se qualquer campo contém "Imbituva"
          if (
            label.toLowerCase().includes('imbituva') ||
            locality.toLowerCase().includes('imbituva') ||
            county.toLowerCase().includes('imbituva')
          ) {
            console.log(`✅ Localização válida em Imbituva`);
            return true;
          }
        }
        
        console.log(`❌ Localização fora de Imbituva`);
        return false;
      }
      
      console.warn('⚠️ Geocodificação reversa não retornou resultados.');
      return false;
    } catch (error) {
      console.error('❌ Erro na verificação de cidade:', error.message);
      // Em caso de erro na API, assume que está em Imbituva para não bloquear o serviço
      return true;
    }
  }

  // Converter coordenadas em endereço usando OpenRouteService
  async converterCoordenadasEmEndereco(lat, lng) {
    try {
      const url = `https://api.openrouteservice.org/geocode/reverse`;
      const response = await axios.get(url, {
        params: {
          api_key: this.orsApiKey,
          'point.lon': lng,
          'point.lat': lat,
          size: 5, // Aumentar para obter mais resultados
          layers: 'address,street,venue' // Focar em endereços específicos
        }
      });

      if (response.data && response.data.features && response.data.features.length > 0) {
        // Priorizar resultados com número de casa
        let bestMatch = null;
        let bestScore = -1;
        
        for (const feature of response.data.features) {
          const properties = feature.properties;
          const hasHouseNumber = properties.housenumber || properties.house_number;
          const accuracy = properties.accuracy || 'street';
          
          // Calcular pontuação para este resultado
          let score = 0;
          if (hasHouseNumber) score += 10; // Prefere endereços com número
          if (accuracy === 'point') score += 5; // Prefere pontos exatos
          if (accuracy === 'centroid') score += 3;
          if (properties.layer === 'address') score += 8; // Prefere camada de endereços
          if (properties.layer === 'venue') score += 5;
          
          // Calcular distância do ponto original
          const featureCoords = feature.geometry.coordinates;
          const distance = Math.sqrt(
            Math.pow(featureCoords[0] - lng, 2) + 
            Math.pow(featureCoords[1] - lat, 2)
          );
          
          // Penalizar por distância (quanto mais longe, menor o score)
          score -= distance * 1000;
          
          console.log(`Reverse geocoding resultado: ${properties.label}, score: ${score.toFixed(2)}, has number: ${!!hasHouseNumber}, layer: ${properties.layer}`);
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = feature;
          }
        }
        
        // Se não encontrou nenhum com número, pegar o primeiro resultado
        const selectedFeature = bestMatch || response.data.features[0];
        const endereco = selectedFeature.properties.label || '';
        
        console.log(`Endereço selecionado para reverse geocoding: ${endereco}`);
        
        return endereco;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao converter coordenadas em endereço:', error.message);
      return null;
    }
  }

  // Nova função: Converter endereço em coordenadas usando OpenRouteService (geocodificação direta)
  async converterEnderecoEmCoordenadas(endereco) {
    try {
      const url = `https://api.openrouteservice.org/geocode/search`;
      const response = await axios.get(url, {
        params: {
          api_key: this.orsApiKey,
          text: endereco,
          size: 5, // Aumentar para obter mais resultados e escolher o melhor
          layers: 'address,street,venue', // Focar em endereços específicos
          'boundary.country': 'BR' // Limitar ao Brasil
        }
      });

      if (response.data && response.data.features && response.data.features.length > 0) {
        // Priorizar resultados que tenham número na rua (mais específicos)
        let bestMatch = null;
        let bestScore = -1;
        
        for (const feature of response.data.features) {
          const properties = feature.properties;
          const hasHouseNumber = properties.housenumber || properties.house_number;
          const accuracy = properties.accuracy || 'street';
          
          // Calcular pontuação para este resultado
          let score = 0;
          if (hasHouseNumber) score += 10; // Prefere endereços com número
          if (accuracy === 'point') score += 5; // Prefere pontos exatos
          if (accuracy === 'centroid') score += 3;
          if (properties.layer === 'address') score += 8; // Prefere camada de endereços
          if (properties.layer === 'venue') score += 5;
          
          // Log para debug
          console.log(`Geocoding resultado: ${properties.label}, score: ${score}, accuracy: ${accuracy}, layer: ${properties.layer}`);
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = feature;
          }
        }
        
        // Se não encontrou nenhum com número, pegar o primeiro resultado
        const selectedFeature = bestMatch || response.data.features[0];
        const coordinates = selectedFeature.geometry.coordinates;
        const [lng, lat] = coordinates;
        
        console.log(`Endereço selecionado para geocodificação: ${selectedFeature.properties.label}`);
        
        return {
          lat: lat,
          lng: lng,
          enderecoCompleto: selectedFeature.properties.label,
          accuracy: selectedFeature.properties.accuracy || 'street'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao converter endereço em coordenadas:', error.message);
      return null;
    }
  }

  // Nova função: Calcular taxa de entrega com base no endereço digitado
  async calcularTaxaPorEndereco(endereco) {
    try {
      console.log(`\n🔍 Calculando taxa para endereço: "${endereco}"`);
      
      // 1. Converter endereço em coordenadas
      const geocodeResult = await this.converterEnderecoEmCoordenadas(endereco);
      
      if (!geocodeResult) {
        console.log('❌ Não foi possível geocodificar o endereço');
        return {
          success: false,
          error: 'Não foi possível encontrar as coordenadas para o endereço informado. Por favor, verifique se o endereço está correto.'
        };
      }
      
      const coordinates = {
        lat: geocodeResult.lat,
        lng: geocodeResult.lng
      };
      
      console.log(`📍 Coordenadas encontradas: ${coordinates.lat}, ${coordinates.lng}`);
      console.log(`📝 Endereço completo: ${geocodeResult.enderecoCompleto}`);
      console.log(`🎯 Precisão: ${geocodeResult.accuracy}`);
      
      // 2. Verificar se está em Imbituva
      const cidadeValida = await this.verificarSeEstaEmImbituva(coordinates.lat, coordinates.lng);
      
      // Se não estiver em Imbituva, calcular taxa mínima
      if (!cidadeValida) {
        console.log('⚠️ Localização fora de Imbituva');
        
        // Calcular distância entre restaurante e cliente
        const distance = await this.calculateDistance(
          this.restaurantCoordinates,
          coordinates
        );
        
        console.log(`📏 Distância calculada: ${distance.toFixed(2)} km`);
        
        // Obter a taxa mínima (primeira regra de precificação)
        const minimumPrice = this.pricingRules[0].price;
        
        console.log(`💰 Taxa mínima aplicada: R$ ${minimumPrice.toFixed(2)}`);
        
        return {
          success: true,
          distance: distance,
          price: minimumPrice,
          error: null,
          coordinates: coordinates,
          endereco: geocodeResult.enderecoCompleto,
          isOutsideImbituva: true,
          enderecoDigitado: true // Flag para não gerar link no WhatsApp
        };
      }
      
      // 3. Calcular distância entre restaurante e cliente
      const distance = await this.calculateDistance(
        this.restaurantCoordinates,
        coordinates
      );
      
      console.log(`📏 Distância calculada: ${distance.toFixed(2)} km`);
      
      // 4. Calcular valor da entrega
      const deliveryInfo = this.calculateDeliveryPrice(distance);
      
      if (deliveryInfo.error) {
        console.log(`❌ Erro no cálculo: ${deliveryInfo.error}`);
      } else {
        console.log(`💰 Taxa de entrega: R$ ${deliveryInfo.price.toFixed(2)}`);
      }
      
      return {
        success: true,
        distance: deliveryInfo.distance,
        price: deliveryInfo.price,
        error: deliveryInfo.error,
        coordinates: coordinates,
        endereco: geocodeResult.enderecoCompleto,
        accuracy: geocodeResult.accuracy,
        enderecoDigitado: true // Flag para não gerar link no WhatsApp
      };
    } catch (error) {
      console.error('❌ Erro ao calcular taxa por endereço:', error);
      return {
        success: false,
        error: 'Erro ao calcular taxa de entrega. Por favor, tente novamente.'
      };
    }
  }

  // Processar coordenadas do cliente e calcular entrega
  async processDelivery(clientCoordinates) {
    try {
      // Verificar se a localização está em Imbituva
      const cidadeValida = await this.verificarSeEstaEmImbituva(clientCoordinates.lat, clientCoordinates.lng);
      
      // Se não estiver em Imbituva, calcular taxa mínima
      if (!cidadeValida) {
        // Calcular distância entre restaurante e cliente
        const distance = await this.calculateDistance(
          this.restaurantCoordinates,
          clientCoordinates
        );
        
        // Obter a taxa mínima (primeira regra de precificação)
        const minimumPrice = this.pricingRules[0].price;
        
        // Converter coordenadas em endereço
        const endereco = await this.converterCoordenadasEmEndereco(clientCoordinates.lat, clientCoordinates.lng);
        
        return {
          success: true,
          distance: distance,
          price: minimumPrice,
          error: null,
          coordinates: clientCoordinates,
          endereco: endereco,
          isOutsideImbituva: true
        };
      }

      // Calcular distância entre restaurante e cliente
      const distance = await this.calculateDistance(
        this.restaurantCoordinates,
        clientCoordinates
      );
      
      // Calcular valor da entrega
      const deliveryInfo = this.calculateDeliveryPrice(distance);
      
      // Converter coordenadas em endereço
      const endereco = await this.converterCoordenadasEmEndereco(clientCoordinates.lat, clientCoordinates.lng);
      
      return {
        success: true,
        distance: deliveryInfo.distance,
        price: deliveryInfo.price,
        error: deliveryInfo.error,
        coordinates: clientCoordinates,
        endereco: endereco // Adicionando o endereço convertido
      };
    } catch (error) {
      console.error('Erro ao processar entrega:', error);
      return {
        success: false,
        error: 'Erro ao calcular entrega. Por favor, tente novamente.'
      };
    }
  }

  // Processar localização recebida via WhatsApp
  async processWhatsAppLocation(latitude, longitude) {
    try {
      const clientCoordinates = {
        lat: parseFloat(latitude),
        lng: parseFloat(longitude)
      };
      
      return await this.processDelivery(clientCoordinates);
    } catch (error) {
      console.error('Erro ao processar localização do WhatsApp:', error);
      return {
        success: false,
        error: 'Erro ao processar localização recebida.'
      };
    }
  }
}

export default DeliveryService;