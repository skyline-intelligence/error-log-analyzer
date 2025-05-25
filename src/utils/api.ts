import { lastValueFrom } from 'rxjs';
import { getBackendSrv } from '@grafana/runtime';

let cachedInstanceId: string | null = null;
let cachedServerAddress: string | null = null;

export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

export const fetchGrafanaInstanceId = (): string => {
    // If there's already a cached instance ID, return it directly
    if (cachedInstanceId) {
      return cachedInstanceId;
    }
    
    // Synchronously initialize a default value
    let domain = window.location.hostname;
    /* if (domain === 'localhost' || domain === '127.0.0.1') {
      fetchRemoteAddress().then(address => {
        domain = address;
      });
    } */
    return domain;
  };

  export const getPluginConfig = async (): Promise<string | null> => {
    try {
      // 如果已经有缓存的服务器地址，直接返回
      if (cachedServerAddress) {
        return cachedServerAddress;
      }
      
      // 从localStorage获取，如果有则直接返回
      const storedAddress = localStorage.getItem('skyline_analyzer_url');
      if (storedAddress) {
        cachedServerAddress = storedAddress;
        return storedAddress;
      }
      
      // 否则从后端获取配置
      const backendSrv = getBackendSrv();
      const response = await backendSrv.get('/api/plugins/skylineintelligence-errorloganalyzer-app/resources/config');
      
      if (response && response.analyzer_server && response.analyzer_server !== "none") {
        const serverAddress = response.analyzer_server;
        localStorage.setItem('skyline_analyzer_url', serverAddress);
        cachedServerAddress = serverAddress;
        return serverAddress;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch config:', error);
      return null;
    }
  };

export const getHttpRequest = async (requestBody: any, uri: string): Promise<any> => {
  await getPluginConfig();
let serverAddress = localStorage.getItem('skyline_analyzer_url');
requestBody.tenant = fetchGrafanaInstanceId();
let formattedUrl = serverAddress;
if (serverAddress && !serverAddress.startsWith('http://') && !serverAddress.startsWith('https://')) {
  formattedUrl = `http://${serverAddress}`;
}

// 构建查询参数
const queryParams = new URLSearchParams();
for (const key in requestBody) {
  if (requestBody.hasOwnProperty(key)) {
    queryParams.append(key, requestBody[key]);
  }
}

// 将查询参数添加到URL
formattedUrl = `${formattedUrl}${uri}?${queryParams.toString()}`;
console.error('request url: ', formattedUrl);

const response = await fetch(formattedUrl, {
  method: 'GET',
  headers: {
    "Accept": "application/json"
  },
  credentials: 'include'
});

// Check response status
if (!response.ok) {
  throw new Error(`Request failed: ${response.statusText}`);
}
// Parse JSON data
console.error('response: ', response);
let data =  await response.json();
console.error('data: ', data);
if (data.status !== 'success') {
  throw new BusinessError(`${data.data}`);
}
return data.data;
};

export const postHttpRequest = async (requestBody: any, uri: string): Promise<any> => {
  await getPluginConfig();
  let serverAddress = localStorage.getItem('skyline_analyzer_url');
  requestBody.tenant = fetchGrafanaInstanceId();
  let formattedUrl = serverAddress;
  if (serverAddress && !serverAddress.startsWith('http://') && !serverAddress.startsWith('https://')) {
    formattedUrl = `http://${serverAddress}`;
  }

  // 构建完整URL
  formattedUrl = `${formattedUrl}${uri}`;
  console.error('request url: ', formattedUrl);

  const response = await fetch(formattedUrl, {
    method: 'POST',
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody),
    credentials: 'include'
  });

  // Check response status
  if (!response.ok) {
    throw new Error(`Request failed: ${response.statusText}`);
  }
  // Parse JSON data
  console.error('response: ', response);
  let data = await response.json();
  console.error('data: ', data);
  if (data.status !== 'success') {
    throw new BusinessError(`${data.data}`);
  }
  return data.data;
};

// Update plugin and reload
export const updatePluginAndReload = async (
  pluginId: string, 
  apiUrl: string, 
  apiToken: string, 
  setShowSuccessAlert: (show: boolean) => void,
  authType?: string,
  username?: string,
  password?: string,
  command?: string
) => {
  try {
    await updatePlugin(pluginId, apiUrl, apiToken, setShowSuccessAlert, authType, username, password, command);

    // Delay page refresh by 2 seconds to allow user to see success message
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (e) {
    console.error('Error while updating the plugin', e);
    setShowSuccessAlert(false);
  }
};

// Update plugin
export const updatePlugin = async (
  pluginId: string, 
  apiUrl: string, 
  apiToken: string, 
  setShowSuccessAlert: (show: boolean) => void,
  authType?: string,
  username?: string,
  password?: string,
  command?: string
) => {
    
  const requestBody = {
    loki_url: apiUrl,
    token: apiToken,
    command: command,
    auth_type: authType || 'basic',
    username: username || '',
    password: password || ''
  };

  const uri = '/api/v1/management/save_config';
  const data = await getHttpRequest(requestBody, uri);
  setShowSuccessAlert(true);
};

export const fetchLicenseData = async (): Promise<{license_type: string; expired_date: string}> => {
  try {
    const requestBody = {
      command: 'query_license'
    };
    
    const uri = '/api/v1/management/fetch_license';
    const data = await getHttpRequest(requestBody, uri);
    console.log('License data:', data);
    
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return data;
  } catch (error) {
    console.error('Failed to get license information:', error);
    throw error;
  }
};

export const updateLicenseData = async (license: string) => {
  try {
    const requestBody = {
      command: 'update_license',
      license: license
    };
    const uri = '/api/v1/management/update_license';
    const data = await getHttpRequest(requestBody, uri);
    return data;
  } catch (error) {
    console.error('Update license failed:', error);
    throw error;
  }
};

export const fetchGrafanaConfig = async (command: string) => {
  const requestBody = {
    command: command
  };
  const uri = '/api/v1/management/fetch_config';
  const data = await getHttpRequest(requestBody, uri);
  
  // 新的数据结构直接包含所需字段，无需复杂解析
  if (data && typeof data === 'object') {
    // 获取 loki_url
    const urlValue = data.loki_url ? data.loki_url.trim() : '';
    
    // 获取 token
    const tokenValue = data.token || '';
    
    // 获取 auth_type
    const authTypeValue = data.auth_type || 'bearer';
    
    // 获取 username
    const usernameValue = data.username || '';
    
    // 获取 password
    const passwordValue = data.password || '';
    
    // 判断认证信息是否设置
    const isApiKeySet = Boolean(tokenValue) || (authTypeValue === 'basic' && Boolean(usernameValue));
    
    if (urlValue) {
      console.error('urlValue: ', urlValue);
      console.error('tokenValue: ', tokenValue);
      console.error('authTypeValue: ', authTypeValue);
      console.error('usernameValue: ', usernameValue);
      console.error('passwordValue: ', passwordValue);
      console.error('isApiKeySet: ', isApiKeySet);
      return {
        apiUrl: urlValue,
        apiKey: tokenValue,
        isApiKeySet: isApiKeySet,
        authType: authTypeValue,
        username: usernameValue,
        password: passwordValue,
      };
    }
  }
  
  // 返回空配置（如果没有找到有效的URL）
  return {
    apiUrl: '',
    apiKey: '',
    isApiKeySet: false,
    authType: 'bearer',
    username: '',
    password: '',
  };
};

export function convertRoleNames(response: any[]): string[] {
  const roleNames = Array.isArray(response) 
      ? response
          .sort((a, b) => {
            const timeA = a.create_time ? new Date(a.create_time).getTime() : 0;
            const timeB = b.create_time ? new Date(b.create_time).getTime() : 0;
            
            return timeA - timeB;
          })
          .map(role => typeof role === 'string' ? role : role.role_name || '')
      : [];
    
    return roleNames;
}

export const fetchRoleNames = async (): Promise<string[]> => {
  try {
    const requestBody = {
      command: 'get_roles',
      group: "default"
    };
    
    const response = await getHttpRequest(requestBody, "/api/v1/management/fetch_roles");
    
    const roleNames = Array.isArray(response) 
      ? response
          .sort((a, b) => {
            const timeA = a.create_time ? new Date(a.create_time).getTime() : 0;
            const timeB = b.create_time ? new Date(b.create_time).getTime() : 0;
            
            return timeA - timeB;
          })
          .map(role => typeof role === 'string' ? role : role.role_name || '')
      : [];
    
    return roleNames;
  } catch (error) {
    console.error('Error getting role names:', error);
    return [];
  }
};