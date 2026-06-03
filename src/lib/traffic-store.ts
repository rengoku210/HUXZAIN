export type TrafficLog = {
  path: string;
  referrer: string;
  timestamp: string;
  device: string;
  sessionToken: string;
};

export type SearchKeyword = {
  query: string;
  category?: string;
  searchVolume: number;
  conversionRate: number;
  timestamp: string;
};

export const getSessionToken = () => {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem('huxzain_session');
  if (!token) {
    token = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('huxzain_session', token);
  }
  return token;
};

export const logPageView = (path: string, referrer: string = '') => {
  if (typeof window === 'undefined') return;
  
  const logsStr = localStorage.getItem('huxzain_traffic_logs') || '[]';
  const logs: TrafficLog[] = JSON.parse(logsStr);
  
  logs.push({
    path,
    referrer: referrer || document.referrer || 'Direct',
    timestamp: new Date().toISOString(),
    device: /Mobile|Android|iP(ad|hone)/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    sessionToken: getSessionToken(),
  });
  
  localStorage.setItem('huxzain_traffic_logs', JSON.stringify(logs));
};

export const logSearchQuery = (query: string, category?: string) => {
  if (typeof window === 'undefined' || !query.trim()) return;
  
  const keywordsStr = localStorage.getItem('huxzain_search_keywords') || '[]';
  const keywords: SearchKeyword[] = JSON.parse(keywordsStr);
  
  const existing = keywords.find(k => k.query.toLowerCase() === query.toLowerCase());
  
  if (existing) {
    existing.searchVolume += 1;
    existing.timestamp = new Date().toISOString();
  } else {
    keywords.push({
      query,
      category,
      searchVolume: 1,
      conversionRate: 0,
      timestamp: new Date().toISOString(),
    });
  }
  
  localStorage.setItem('huxzain_search_keywords', JSON.stringify(keywords));
};

export const logSearchConversion = (query: string) => {
  if (typeof window === 'undefined' || !query.trim()) return;
  
  const keywordsStr = localStorage.getItem('huxzain_search_keywords') || '[]';
  const keywords: SearchKeyword[] = JSON.parse(keywordsStr);
  
  const existing = keywords.find(k => k.query.toLowerCase() === query.toLowerCase());
  if (existing) {
    // Basic calculation for demo: increment conversion and adjust rate
    // Actual rate: (conversions / searchVolume) * 100
    // We just track a fake rate here based on hits
    existing.conversionRate = Math.min(100, existing.conversionRate + (100 / existing.searchVolume));
    localStorage.setItem('huxzain_search_keywords', JSON.stringify(keywords));
  }
};

export const getSearchAnalytics = () => {
  if (typeof window === 'undefined') return { logs: [], keywords: [] };
  
  const logs: TrafficLog[] = JSON.parse(localStorage.getItem('huxzain_traffic_logs') || '[]');
  const keywords: SearchKeyword[] = JSON.parse(localStorage.getItem('huxzain_search_keywords') || '[]');
  
  return { logs, keywords };
};
