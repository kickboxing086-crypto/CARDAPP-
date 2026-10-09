export interface AddressLookupResult {
  street: string;
  number?: string;
  neighborhood: string;
  city: string;
  state?: string;
  cep?: string;
}

/**
 * Formata um valor de CEP para a máscara 00000-000
 */
export function formatCep(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Busca endereço completo a partir do CEP brasileiro utilizando a API ViaCEP
 */
export async function fetchAddressByCep(cepInput: string): Promise<AddressLookupResult | null> {
  const cleanCep = cepInput.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    throw new Error('O CEP deve conter 8 dígitos.');
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!response.ok) {
      throw new Error('Falha ao consultar serviço de CEP.');
    }

    const data = await response.json();
    if (data.erro) {
      throw new Error('CEP não encontrado. Verifique os números digitados.');
    }

    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      cep: data.cep || formatCep(cleanCep),
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Não foi possível buscar o endereço pelo CEP.');
  }
}

/**
 * Busca o endereço em tempo real através das coordenadas do GPS (Geolocalização)
 * Utiliza o serviço OpenStreetMap Nominatim com fallback para BigDataCloud.
 */
export async function fetchAddressByCoordinates(
  latitude: number,
  longitude: number
): Promise<AddressLookupResult> {
  // Tentativa 1: Nominatim OpenStreetMap
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      const street =
        addr.road ||
        addr.street ||
        addr.pedestrian ||
        addr.residential ||
        addr.highway ||
        addr.footway ||
        data.display_name?.split(',')[0] ||
        '';

      const neighborhood =
        addr.suburb ||
        addr.neighbourhood ||
        addr.city_district ||
        addr.quarter ||
        addr.district ||
        '';

      const city =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.village ||
        addr.county ||
        '';

      const state = addr.state || '';
      const cep = addr.postcode ? formatCep(addr.postcode) : '';
      const number = addr.house_number || '';

      if (street || city) {
        return {
          street,
          number,
          neighborhood,
          city,
          state,
          cep,
        };
      }
    }
  } catch {
    // continua para o fallback
  }

  // Tentativa 2: Fallback BigDataCloud (gratuito para geolocalização reversa client-side)
  try {
    const url2 = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`;
    const res2 = await fetch(url2);
    if (res2.ok) {
      const data2 = await res2.json();
      const street = data2.locality || data2.principalSubdivision || '';
      const neighborhood = data2.localityInfo?.administrative?.[3]?.name || '';
      const city = data2.city || data2.locality || '';
      const state = data2.principalSubdivisionCode?.replace('BR-', '') || '';
      const cep = data2.postcode ? formatCep(data2.postcode) : '';

      return {
        street,
        neighborhood,
        city,
        state,
        cep,
      };
    }
  } catch {
    // fallback final
  }

  throw new Error('Não foi possível identificar o endereço exato pelas coordenadas do GPS.');
}
