import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    console.log('🔍 Searching for properties:', query);

    // First, try to get real property data using RentCast API
    let suggestions = [];
    
    try {
      // Use RentCast API for real property data
      const rentcastResponse = await fetch(`https://api.rentcast.io/v1/properties/search?address=${encodeURIComponent(query)}&limit=5`, {
        method: 'GET',
        headers: {
          'X-Api-Key': process.env.RENTCAST_API_KEY || '',
          'Accept': 'application/json',
        }
      });

      if (rentcastResponse.ok) {
        const rentcastData = await rentcastResponse.json();
        console.log('✅ RentCast API response:', rentcastData);
        
        if (rentcastData?.results?.length > 0) {
          suggestions = rentcastData.results.map((property: any, index: number) => ({
            id: property.id || `rentcast-${Date.now()}-${index}`,
            address: property.formattedAddress || property.address,
            city: property.city,
            state: property.state,
            zipCode: property.zipCode,
            propertyType: property.propertyType === 'Single Family' ? 'single-family' : property.propertyType?.toLowerCase(),
            asIsValue: property.value || property.price,
            estimatedValue: property.rentEstimate ? property.value * 1.15 : property.value, // Estimate 15% above current if rental available
            purchasePrice: property.lastSalePrice || (property.value * 0.95), // Estimate 5% below value
            yearBuilt: property.yearBuilt,
            sqft: property.squareFootage || property.livingArea,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            lotSize: property.lotSize,
            propertyTaxes: property.taxAmount || (property.value * 0.015), // Estimate 1.5% of value
            lastSoldDate: property.lastSaleDate,
            lastSoldPrice: property.lastSalePrice,
            source: 'rentcast'
          }));
        }
      } else {
        console.log('⚠️ RentCast API failed:', rentcastResponse.status);
      }
    } catch (apiError) {
      console.log('⚠️ RentCast API error:', apiError);
    }

    // If no real data found or API failed, fallback to enhanced mock data
    if (suggestions.length === 0) {
      console.log('📊 Using enhanced mock data as fallback');
      
      const mockSuggestions = [
        {
          id: `mock-1-${Date.now()}`,
          address: `${query} Oak Street`,
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          propertyType: 'single-family',
          asIsValue: 450000,
          estimatedValue: 520000,
          purchasePrice: 425000,
          yearBuilt: 1985,
          sqft: 1850,
          bedrooms: 3,
          bathrooms: 2,
          lotSize: 0.25,
          propertyTaxes: 8500,
          lastSoldDate: '2021-03-15',
          lastSoldPrice: 395000,
          source: 'mock'
        },
        {
          id: `mock-2-${Date.now()}`,
          address: `${query} Pine Avenue`,
          city: 'Dallas',
          state: 'TX',
          zipCode: '75201',
          propertyType: 'single-family',
          asIsValue: 380000,
          estimatedValue: 450000,
          purchasePrice: 365000,
          yearBuilt: 1978,
          sqft: 1650,
          bedrooms: 3,
          bathrooms: 2,
          lotSize: 0.2,
          propertyTaxes: 7200,
          lastSoldDate: '2020-11-20',
          lastSoldPrice: 340000,
          source: 'mock'
        },
        {
          id: `mock-3-${Date.now()}`,
          address: `${query} Maple Drive`,
          city: 'Houston',
          state: 'TX',
          zipCode: '77001',
          propertyType: 'single-family',
          asIsValue: 325000,
          estimatedValue: 390000,
          purchasePrice: 310000,
          yearBuilt: 1992,
          sqft: 1400,
          bedrooms: 2,
          bathrooms: 2,
          lotSize: 0.18,
          propertyTaxes: 6100,
          lastSoldDate: '2022-08-10',
          lastSoldPrice: 295000,
          source: 'mock'
        }
      ];

      // Filter suggestions based on query
      suggestions = mockSuggestions.filter(property =>
        property.address.toLowerCase().includes(query.toLowerCase()) ||
        property.city.toLowerCase().includes(query.toLowerCase())
      );
    }

    console.log(`📋 Returning ${suggestions.length} suggestions`);

    return NextResponse.json({ 
      suggestions,
      query,
      source: suggestions.length > 0 ? suggestions[0].source : 'none',
      count: suggestions.length
    });

  } catch (error) {
    console.error('❌ Property search error:', error);
    return NextResponse.json(
      { error: 'Failed to search properties' },
      { status: 500 }
    );
  }
}

// Alternative free APIs you can try:
/*
1. Google Places API (requires API key):
   - Endpoint: https://maps.googleapis.com/maps/api/place/autocomplete/json
   - Good for address autocomplete
   
2. Nominatim (OpenStreetMap - Free):
   - Endpoint: https://nominatim.openstreetmap.org/search
   - Free but limited property details
   
3. US Census Geocoding API (Free):
   - Endpoint: https://geocoding.census.gov/geocoder/locations/onelineaddress
   - Free government API for address validation
*/

// Example of how to integrate with Google Places API:
/*
async function searchWithGooglePlaces(query: string) {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&components=country:us&key=${GOOGLE_PLACES_API_KEY}`
  );

  if (!response.ok) {
    throw new Error('Google Places API request failed');
  }

  return await response.json();
}
*/

// Example of how to get property details from Zillow or similar:
/*
async function getPropertyDetails(address: string) {
  const PROPERTY_API_KEY = process.env.PROPERTY_API_KEY;
  
  // This would call Zillow, Attom, or RentSpider API
  const response = await fetch(
    `https://api.propertyservice.com/property/details?address=${encodeURIComponent(address)}&key=${PROPERTY_API_KEY}`
  );

  if (!response.ok) {
    throw new Error('Property API request failed');
  }

  return await response.json();
}
*/ 