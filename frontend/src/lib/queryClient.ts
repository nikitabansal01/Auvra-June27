import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Get backend URL from environment variable
const getBackendUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  // Debug: Log environment variable
  console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
  console.log('baseUrl:', baseUrl);
  console.log('path:', path);
  
  if (baseUrl && !path.startsWith('http')) {
    const fullUrl = `${baseUrl}${path}`;
    console.log('Full URL:', fullUrl);
    return fullUrl;
  }
  
  console.log('Returning path as is:', path);
  return path;
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get token from localStorage or context
  const token = localStorage.getItem('authToken') || 'demo-token';
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const fullUrl = getBackendUrl(url);
  console.log('apiRequest - fullUrl:', fullUrl);

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('authToken') || 'demo-token';
    
    const fullUrl = getBackendUrl(queryKey[0] as string);
    console.log('getQueryFn - fullUrl:', fullUrl);
    
    const res = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
