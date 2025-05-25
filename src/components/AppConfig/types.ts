export interface State {
  apiUrl: string;
  apiKey: string;
  isApiKeySet: boolean;
  authType?: 'bearer' | 'basic';
  username?: string;
  password?: string;
}

export interface AppConfigProps {
  plugin: {
    meta: {
      id: string;
      name: string;
      jsonData: {
        apiUrl?: string;
        writeApiUrl?: string;
        writeAuthType?: 'bearer' | 'basic';
        writeUsername?: string;
      };
      secureJsonFields: {
        apiKey?: boolean;
        writeApiKey?: boolean;
      };
    };
  };
}
