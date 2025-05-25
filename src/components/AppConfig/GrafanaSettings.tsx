import React, { useState } from 'react';
import { Button, Input, Form, Modal, Space, Typography, Card, Descriptions, Radio, Divider } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { testIds } from '../testIds';

const { Title, Text } = Typography;

interface GrafanaSettingsProps {
  state: {
    apiUrl: string;
    apiKey: string;
    isApiKeySet: boolean;
    authType?: 'bearer' | 'basic';  // Changed to bearer and basic
    username?: string;
    password?: string;
  };
  pluginId: string;
  setShowSuccessAlert: (show: boolean) => void;
  updatePluginAndReload: (pluginId: string, apiUrl: string, apiToken: string, setShowSuccessAlert: (show: boolean) => void, authType?: string, username?: string, password?: string) => void;
}

const GrafanaSettings: React.FC<GrafanaSettingsProps> = ({ 
  state, 
  pluginId, 
  setShowSuccessAlert,
  updatePluginAndReload
}) => {
  const [showUpdateModal, setShowUpdateModal] = React.useState(false);
  const [form] = Form.useForm();
  const [authType, setAuthType] = useState<'bearer' | 'basic'>(state.authType || 'bearer');  // Changed default value to bearer

  // Open update dialog
  const openUpdateModal = () => {
    form.setFieldsValue({
      apiUrl: state.apiUrl,
      authType: state.authType || 'bearer',  // Changed default value to bearer
      apiKey: '',  // Don't show API Key, let user input again
      username: state.username || '',
      password: '',  // Don't show password, let user input again
    });
    setAuthType(state.authType || 'bearer');  // Changed default value to bearer
    setShowUpdateModal(true);
  };

  // Submit update
  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      updatePluginAndReload(
        pluginId, 
        values.apiUrl, 
        values.authType === 'bearer' ? values.apiKey : '',  // Changed to bearer
        setShowSuccessAlert,
        values.authType,
        values.authType === 'basic' ? values.username : '',  // Changed to basic
        values.authType === 'basic' ? values.password : ''   // Changed to basic
      );
      setShowUpdateModal(false);
    } catch (errorInfo) {
      console.error('Validation Failed:', errorInfo);
    }
  };

  // Handle authentication type change
  const handleAuthTypeChange = (e: any) => {
    setAuthType(e.target.value);
  };

  // Check if Grafana settings are configured
  const isConfigured = state.apiUrl && (state.isApiKeySet || (state.authType === 'basic' && state.username));  // Changed to basic

  return (
    <>
      <Card title={<Title level={4}>Loki Query Settings</Title>} bordered={false}>
        {isConfigured ? (
          <>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Loki Query Url">
                <Text>{state.apiUrl}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Auth Type">
                <Text>{state.authType === 'basic' ? 'Basic Auth' : 'Bearer Auth'}</Text>
              </Descriptions.Item>
              {state.authType === 'basic' ? (
                <>
                  <Descriptions.Item label="Username">
                    <Text>{state.username}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Password">
                    <Text>******</Text>
                  </Descriptions.Item>
                </>
              ) : (
                <Descriptions.Item label="API Token">
                  <Text>{state.isApiKeySet ? state.apiKey : 'Not Set'}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
            
            <div style={{ marginTop: 16, textAlign: 'left' }}>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={openUpdateModal}
                data-testid={testIds.appConfig.submit}
              >
                Update Loki Query Settings
              </Button>
            </div>
          </>
        ) : (
          <Form
            layout="vertical"
            onFinish={(values) => {
              updatePluginAndReload(
                pluginId, 
                values.apiUrl, 
                values.authType === 'bearer' ? values.apiKey : '',  // Changed to bearer
                setShowSuccessAlert,
                values.authType,
                values.authType === 'basic' ? values.username : '',  // Changed to basic
                values.authType === 'basic' ? values.password : ''   // Changed to basic
              );
            }}
            initialValues={{
              apiUrl: state.apiUrl || '',
              authType: state.authType || 'bearer',  // Changed default value to bearer
              apiKey: '',
              username: state.username || '',
              password: ''
            }}
          >
            <Form.Item
              name="apiUrl"
              label="Loki Query Url"
              rules={[{ required: true, message: 'Please input Loki URL!' }]}
              extra="A url to query loki logs"
            >
              <Input 
                placeholder="Your Loki Url Address"
                data-testid={testIds.appConfig.apiUrl}
              />
            </Form.Item>
            
            <Form.Item name="authType" label="Auth Type">
              <Radio.Group onChange={handleAuthTypeChange} defaultValue={state.authType || 'bearer'}>  {/* Changed default value to bearer */}
                <Radio.Button value="bearer">Bearer Auth</Radio.Button>  {/* Changed option text */}
                <Radio.Button value="basic">Basic Auth</Radio.Button>    {/* Changed option text */}
              </Radio.Group>
            </Form.Item>
            
            {authType === 'bearer' ? (  // Changed to bearer
              <Form.Item
                name="apiKey"
                label="API Token"
                rules={[{ required: true, message: 'Please input API Token!' }]}
                extra="The token to access the loki"
              >
                <Input 
                  placeholder="Your Loki Url Token"
                  data-testid={testIds.appConfig.apiKey}
                />
              </Form.Item>
            ) : (
              <>
                <Form.Item
                  name="username"
                  label="Username"
                  rules={[{ required: true, message: 'Please input username!' }]}
                >
                  <Input placeholder="Loki user name" />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: 'Please input password!' }]}
                >
                  <Input.Password placeholder="Loki password" />
                </Form.Item>
              </>
            )}
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit"
                data-testid={testIds.appConfig.submit}
              >
                Save Loki Query Settings
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>

      <Modal
        title="Update Loki Query Settings"
        open={showUpdateModal}
        onCancel={() => setShowUpdateModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="apiUrl"
            label="Loki Query Url"
            rules={[{ required: true, message: 'Please input Loki URL!' }]}
          >
            <Input placeholder="Please Input Loki URL" />
          </Form.Item>
          
          <Form.Item name="authType" label="Auth Type">
            <Radio.Group onChange={handleAuthTypeChange} defaultValue={state.authType || 'bearer'}>  {/* Changed default value to bearer */}
              <Radio.Button value="bearer">Bearer Auth</Radio.Button>  {/* Changed option text */}
              <Radio.Button value="basic">Basic Auth</Radio.Button>    {/* Changed option text */}
            </Radio.Group>
          </Form.Item>
          
          {authType === 'bearer' ? (  // Changed to bearer
            <Form.Item
              name="apiKey"
              label="API Token"
              rules={[{ required: true, message: 'Please input API Token!' }]}
            >
              <Input placeholder="Please Input Loki Token" />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: 'Please input username!' }]}
              >
                <Input placeholder="Loki username" />
              </Form.Item>
              <Form.Item
                name="password"
                label="password"
                rules={[{ required: true, message: 'Please input password!' }]}
              >
                <Input.Password placeholder="Loki password" />
              </Form.Item>
            </>
          )}
          
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowUpdateModal(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default GrafanaSettings;