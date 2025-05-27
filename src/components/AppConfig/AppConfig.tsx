import React, { useState, useEffect } from 'react';
import { LoadingPlaceholder } from '@grafana/ui';
import { Alert, message, Input, Button, Modal } from 'antd';
import { AppConfigProps, State } from './types';
import GrafanaSettings from './GrafanaSettings';
import { getBackendSrv } from '@grafana/runtime';
import {
  fetchGrafanaConfig,
  updatePluginAndReload,
  fetchLicenseData,
  updateLicenseData,
  getHttpRequest,
} from '../../utils/api';

const AppConfig = ({ plugin }: AppConfigProps) => {
  const { jsonData, secureJsonFields } = plugin.meta;
  const [state, setQueryState] = useState<State>({
    apiUrl: jsonData?.apiUrl || '',
    apiKey: '',
    isApiKeySet: Boolean(jsonData?.apiKey) || (jsonData?.authType === 'basic' && Boolean(jsonData?.username)),
    authType: jsonData?.authType || 'bearer',
    username: jsonData?.username || '',
  });
  const [writeState, setWriteState] = useState<State>({
    apiUrl: jsonData?.apiUrl || '',
    apiKey: '',
    isApiKeySet: Boolean(jsonData?.apiKey) || (jsonData?.authType === 'basic' && Boolean(jsonData?.username)),
    authType: jsonData?.authType || 'bearer',
    username: jsonData?.username || '',
  });
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverAddress, setServerAddress] = useState('');
  const [grafanaInstanceId, setGrafanaInstanceId] = useState('');
  const [licenseData, setLicenseData] = useState<{license_type: string; expired_date: number} | null>(null);

  const [showLicenseInput, setShowLicenseInput] = useState(false);
  const [newLicense, setNewLicense] = useState('');
  const [isUpdatingLicense, setIsUpdatingLicense] = useState(false);

  // Load configuration when component mounts
  useEffect(() => {
    // Use async function for sequential loading
    async function getPluginConfig() {
      try {
          const backendSrv = getBackendSrv();
          const response = await backendSrv.get('/api/plugins/skylineintelligence-errorloganalyzer-app/resources/config');
          return response;
      } catch (error) {
          console.error('Failed to fetch config:', error);
          return null;
      }
    }
  
    getPluginConfig().then(config => {
      if (config) {
        const serverAddress = config.analyzer_server
        if (serverAddress === "none") {
          message.error("Please setup server address first, add environment variable GF_PLUGINS_ANALYZER_SERVER={your_server_address} to your grafana server!");
          return;
        } else {
          setServerAddress(serverAddress);
          localStorage.setItem('skyline_analyzer_url', serverAddress);
        }
      }
    });

    const loadData = async () => {
      setIsLoading(true);
      try {
          const license = await fetchLicenseData();
          setLicenseData(license);
      } catch (error) {
        console.error('Loading grafana config failed :', error);
      }
        
      try {
        const query_config = await fetchGrafanaConfig('get_grafana_query_config');
        if (query_config) {
          setQueryState({
            ...query_config,
            authType: query_config.authType || jsonData?.authType || 'bearer',
            username: query_config.username || jsonData?.username || '',
            isApiKeySet: Boolean(query_config.apiKey) || (query_config.authType === 'basic' && Boolean(query_config.username)),
          });
        }
      } catch (error) {
        console.error('Loading grafana config failed :', error);
      }
        
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  // Add method to update license
  const handleUpdateLicense = async () => {
    try {
      setIsUpdatingLicense(true);
      await updateLicenseData(newLicense);
      message.success('License updated successfully');
      setShowLicenseInput(false);
      setNewLicense('');
      // Reload license data
      const license = await fetchLicenseData();
      setLicenseData(license);
    } catch (error) {
      Modal.error({
        title: 'Update License Failed',
        content: `${error}`,
      });
    } finally {
      setIsUpdatingLicense(false);
    }
  };

  if (isLoading) {
    return <LoadingPlaceholder text="Loading ..." />;
  }

  const testServerConnection = async () => {
    try {
      const requestBody = {
        command: 'connection'
      };
      
      const uri = '/api/v1/management/connection';
      const result = await getHttpRequest(requestBody, uri);

      if (result === 'ok') {
        message.success('Server connection successful');
      } else {
        message.error('Server connection failed');
      }
    } catch (error) {
      message.error(`Connection error: ${error}`);
    }
  };

  return (
    <div style={{ maxWidth: 800}}>
      {licenseData && licenseData.expired_date < 15 && (
        <>
          <Alert
            message="License Warning"
            description={
              <>
                Your {licenseData.license_type} license will expire in {licenseData.expired_date} days. Please contact <a href="mailto:support@skyline-intelligence.com" style={{ fontWeight: 'bold', color: '#1890ff' }}>support@skyline-intelligence.com</a> to purchase a commercial license.
                Please <a onClick={() => setShowLicenseInput(true)} style={{ fontWeight: 'bold', textDecoration: 'underline', color: '#1890ff' }}>input new license</a> to avoid impact on error log analysis.
              </>
            }
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          {showLicenseInput && (
            <div style={{ marginBottom: 16 }}>
              <Input.TextArea 
                rows={4} 
                value={newLicense} 
                onChange={(e) => setNewLicense(e.target.value)}
                placeholder="Paste new license here"
              />
              <Button 
                type="primary" 
                onClick={handleUpdateLicense}
                loading={isUpdatingLicense}
                style={{ marginTop: 8 }}
              >
                Save License
              </Button>
            </div>
          )}
        </>
      )}

      {showSuccessAlert && (
        <Alert
          message="Update Success"
          description="Loki Settings Saved"
          type="success"
          showIcon
          closable
          onClose={() => setShowSuccessAlert(false)}
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* Server Settings Card */}
      <div style={{ marginBottom: 24, padding: 16, border: '1px solid #d9d9d9', borderRadius: 4 }}>
        <h3>Server Address</h3>
        <div style={{ marginBottom: 8 }}>
          <Input 
            value={serverAddress} 
            readOnly
            style={{ marginBottom: 8 }}
          />
        </div>
        <Button 
          type="primary" 
          onClick={testServerConnection}
          style={{ marginTop: 8 }}
        >
          Test Connection
        </Button>
      </div>
      
      {/* Grafana Read Metrics Settings Card */}
      <GrafanaSettings 
        state={state}
        pluginId={plugin.meta.id}
        setShowSuccessAlert={setShowSuccessAlert}
        updatePluginAndReload={(pluginId, apiUrl, apiToken, setShowSuccessAlert, authType, username, password) => 
          updatePluginAndReload(pluginId, apiUrl, apiToken, setShowSuccessAlert, authType, username, password, 'grafana_query_register')
        }
      />
      
    </div>
  );
};

export default AppConfig;