interface HostelSearchParams {
  country: string;
  maxPrice: number;
  checkin?: string;
  checkout?: string;
}

interface HostelResult {
  id: string;
  name: string;
  location: string;
  country: string;
  price: number;
  rating: number;
  image: string;
  hostelworldUrl: string;
}

// Using SerpAPI for accommodation search (more reliable than scraping)
export async function searchHostels(params: HostelSearchParams): Promise<HostelResult[]> {
  const { country, maxPrice } = params;
  
  try {
    const searchQuery = `hostels in ${country} under $${maxPrice}`;
    const serpApiUrl = `https://serpapi.com/search.json?engine=google_hotels&q=${encodeURIComponent(searchQuery)}&api_key=${import.meta.env.VITE_SERPAPI_KEY}`;
    
    const response = await fetch(serpApiUrl);
    const data = await response.json();
    
    // Transform SerpAPI results to our format
    const hostels: HostelResult[] = (data.properties || [])
      .filter((property: any) => property.rate_per_night?.lowest && property.rate_per_night.lowest <= maxPrice)
      .slice(0, 20) // Limit results
      .map((property: any, index: number) => ({
        id: property.property_token || `hostel-${index}`,
        name: property.name || 'Unknown Hostel',
        location: property.location || country,
        country: country,
        price: property.rate_per_night?.lowest || 0,
        rating: property.overall_rating || 8.0,
        image: property.images?.[0]?.thumbnail || `https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=300&h=200&fit=crop`,
        hostelworldUrl: property.link || `https://www.hostelworld.com/search?search=${encodeURIComponent(property.name)}`
      }));
    
    return hostels;
  } catch (error) {
    console.error('Error fetching hostels:', error);
    return [];
  }
}

// Alternative: ScrapingBee for direct HostelWorld scraping
export async function scrapeHostelWorld(params: HostelSearchParams): Promise<HostelResult[]> {
  const { country, maxPrice } = params;
  
  try {
    const hostelworldUrl = `https://www.hostelworld.com/search?search=${encodeURIComponent(country)}`;
    const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?api_key=${import.meta.env.VITE_SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(hostelworldUrl)}&render_js=true`;
    
    const response = await fetch(scrapingBeeUrl);
    const html = await response.text();
    
    // Parse HTML (simplified - you'd need a more robust parser)
    // This is a basic example - real implementation would need proper HTML parsing
    const hostels: HostelResult[] = [];
    
    // Note: This would require complex HTML parsing
    // For production, consider using a backend service with Cheerio or similar
    
    return hostels;
  } catch (error) {
    console.error('Error scraping HostelWorld:', error);
    return [];
  }
}