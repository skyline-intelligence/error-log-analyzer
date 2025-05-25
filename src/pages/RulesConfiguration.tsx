import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { PluginPage } from '@grafana/runtime';
import { getHttpRequest, postHttpRequest } from '../utils/api';
import { Table, Button as AntButton, Modal, Input, message, Space, Select } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface RuleItem {
  key: string;
  id: number;
  roleName: string;
  className: string;
  ruleContent: string;
  createTime: string;
  updateTime: string;
}

function RulesConfiguration() {
    const styles = useStyles2(getStyles);
    const [data, setData] = useState<RuleItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [currentRule, setCurrentRule] = useState<RuleItem | null>(null);
    const [roleOptions, setRoleOptions] = useState<{value: string, label: string}[]>([]);
    const [validating, setValidating] = useState<boolean>(false);
    const [validationResult, setValidationResult] = useState<string | null>(null);
    const [validationStatus, setValidationStatus] = useState<'success' | 'error' | null>(null);
    const [testKeywords, setTestKeywords] = useState<string>('');
    const [testTrace, setTestTrace] = useState<string>('');
  const [form, setForm] = useState({
    roleName: '',
    className: '',
    ruleContent: ''
  });

  // Define table columns
  const columns: TableColumnsType<RuleItem> = [
    {
      title: 'No.',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Role Name',
      dataIndex: 'roleName',
      key: 'roleName',
      width: 140,
      sorter: (a, b) => a.roleName.localeCompare(b.roleName),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Class Name',
      dataIndex: 'className',
      key: 'className',
      width: 200,
      sorter: (a, b) => a.className.localeCompare(b.className),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Groovy Script',
      dataIndex: 'ruleContent',
      key: 'ruleContent',
      width: 'auto',
      ellipsis: {
        showTitle: true,
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="search rules by content"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <AntButton
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              search
            </AntButton>
            <AntButton
              onClick={() => clearFilters && clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              reset
            </AntButton>
          </Space>
        </div>
      ),
      onFilter: (value, record) => 
        record.ruleContent
          .toString()
          .toLowerCase()
          .includes((value as string).toLowerCase()),
    },
    {
      title: 'Create Time',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 150,
      sorter: (a, b) => {
        if (a.createTime === '-' && b.createTime === '-') return 0;
        if (a.createTime === '-') return -1;
        if (b.createTime === '-') return 1;
        return new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
      },
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Update Time',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 150,
      sorter: (a, b) => {
        if (a.updateTime === '-' && b.updateTime === '-') return 0;
        if (a.updateTime === '-') return -1;
        if (b.updateTime === '-') return 1;
        return new Date(a.updateTime).getTime() - new Date(b.updateTime).getTime();
      },
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <AntButton 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ paddingLeft: 0 }}
          >
            Edit
          </AntButton>
          <AntButton 
            type="text" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            style={{ paddingLeft: 0 }}
          >
            Delete
          </AntButton>
        </Space>
      ),
    },
  ];

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr || dateTimeStr === '-') return '-';
    
    try {
      // 假设输入格式为ISO格式或其他标准格式
      const date = new Date(dateTimeStr);
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) return dateTimeStr;
      
      // 格式化为 YYYY-MM-DD HH:MM:SS
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateTimeStr;
    }
  };

  const validateRule = async () => {
    if (!form.ruleContent.trim()) {
      message.warning('Rule content cannot be empty');
      return;
    }

    if (!testKeywords.trim() || !testTrace.trim()) {
      message.warning('Test keywords and test trace content cannot be empty');
      return;
    }

    setValidating(true);
    setValidationResult(null);
    setValidationStatus(null);

    try {
      const requestBody = {
        rule_content: form.ruleContent.trim(),
        keywords: testKeywords.trim(),
        trace: testTrace.trim()
      };
      
      const response = await postHttpRequest(requestBody, "/api/v1/rule/validate");
      console.error('Validation result:', response);
      
    setValidationStatus('success');
    setValidationResult(response);
    message.success('Validation successful');
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationStatus('error');
      setValidationResult(String(error));
      Modal.error({
        title: 'Validation failed',
        content: `${error}`,
      });
    } finally {
      setValidating(false);
    }
  };

  const fetchRoleOptions = async () => {
    try {
      const requestBody = {
        command: 'get_roles',
        group: "default"
      };
      
      const response = await getHttpRequest(requestBody, "/api/v1/management/fetch_roles");
      console.log('Retrieved role data:', response);
      
      if (Array.isArray(response)) {
        const options = response.map((role, index) => ({
          value: role.role_name || role,
          label: role.role_name || role
        }));
        setRoleOptions(options);
      }
    } catch (error) {
      console.error('Error getting role options:', error);
      Modal.error({
        title: 'Error',
        content: `Failed to get role options: ${error}`,
      });
    }
  };

  // Get rule data
  const fetchRules = async () => {
    setLoading(true);
    try {
      const requestBody = {
        group: 'default'
      };
      
    const response = await getHttpRequest(requestBody, "/api/v1/rule/list");
    console.log('Retrieved rule data:', response);
      
        // Convert data format
    const formattedData = response.map((rule: any, index: number) => ({
        key: index.toString(),
        id: index + 1,
        roleName: rule.role_name,
        className: rule.clazz_name,
        ruleContent: rule.rule_content,
        createTime: formatDateTime(rule.create_time) || '-',
        updateTime: formatDateTime(rule.update_time) || '-',
    }));
    
    setData(formattedData);
    } catch (error) {
      console.error('Error getting rule data:', error);
      Modal.error({
        title: 'Error',
        content: `Failed to get rule data: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetValidation = () => {
    setValidationResult(null);
    setValidationStatus(null);
  };

  // 处理测试关键词变化
  const handleTestKeywordsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTestKeywords(e.target.value);
    resetValidation();
  };

  // 处理测试跟踪内容变化
  const handleTestTraceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTestTrace(e.target.value);
    resetValidation();
  };

  // 处理规则内容变化时重置验证状态
  const handleRuleContentChange = (value: string) => {
    handleInputChange('ruleContent', value);
    resetValidation();
  };

  // Add new rule
  const handleAddRule = () => {
    setIsEditMode(false);
    setCurrentRule(null);
    setForm({
      roleName: '',
      className: '',
      ruleContent: `def process(String keyword, String rawMessage) {
        // Write your rule logic here
        // Process keywords and raw message
        
        // Return processing result
        def result = keyword;
        return result
    }`
    });
    setTestKeywords('');
    setTestTrace('');
    setValidationResult(null);
    setValidationStatus(null);
    setIsModalVisible(true);
  };

  // Edit rule
  const handleEdit = (record: RuleItem) => {
    setIsEditMode(true);
    setCurrentRule(record);
    setForm({
      roleName: record.roleName,
      className: record.className,
      ruleContent: record.ruleContent
    });
    setIsModalVisible(true);
  };

  // Handle input change
  const handleInputChange = (field: string, value: string) => {
    setForm({
      ...form,
      [field]: value
    });
  };

  // Confirm add or update rule
  const handleOk = async () => {
    if (!form.roleName.trim() || !form.className.trim() || !form.ruleContent.trim()) {
      message.warning('All fields cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        role_name: form.roleName.trim(),
        class_name: form.className.trim(),
        rule_content: form.ruleContent.trim(),
        group: 'default'
      };
      
      if (isEditMode) {
        // Update rule
        const response = await postHttpRequest(requestBody, "/api/v1/rule/update");
        message.success(response);
      } else {
        // Add rule
        const response = await postHttpRequest(requestBody, "/api/v1/rule/add");
        message.success(response);
      }
      
      setIsModalVisible(false);
      fetchRules(); // Reload data
    } catch (error) {
      console.error('Error operating rule:', error);
      Modal.error({
        title: 'Operation Failed',
        content: `${error}`,
      });
    } finally {
      setLoading(false);
      setTestKeywords('');
      setTestTrace('');
      setValidationResult(null);
      setValidationStatus(null);
    }
  };

  // Cancel add or edit
  const handleCancel = () => {
    setIsModalVisible(false);
    setTestKeywords('');
    setTestTrace('');
    setValidationResult(null);
    setValidationStatus(null);
  };

  // Delete rule
  const handleDelete = async (record: RuleItem) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Are you sure you want to delete rule "${record.roleName} - ${record.className}"?`,
      onOk: async () => {
        setLoading(true);
        try {
          const requestParams = {
            role_name: record.roleName,
            class_name: record.className
          };
          
          const response = await getHttpRequest(requestParams, "/api/v1/rule/delete");
        message.success(response);
        fetchRules(); // Reload data
        } catch (error) {
          console.error('Error deleting rule:', error);
          Modal.error({
            title: 'Delete Failed',
            content: `${error}`,
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Initialize data loading
  useEffect(() => {
    fetchRules();
    fetchRoleOptions();

    // 检查是否有从PageTwo页面传递过来的数据
    const ruleRoleName = localStorage.getItem('ruleRoleName');
    const ruleClassName = localStorage.getItem('ruleClassName');
    const ruleKeywords = localStorage.getItem('ruleKeywords') || '';
    const ruleRawMessage = localStorage.getItem('ruleRawMessage') || '';
    
    if (ruleClassName && ruleRoleName) {
      // 先查询该规则是否存在
      const queryRule = async () => {
        try {
          // 调用query_rule接口
          const requestParams = {
            role_name: ruleRoleName,
            class_name: ruleClassName
          };
          
          const ruleData = await getHttpRequest(requestParams, "/api/v1/rule/query_rule");
          console.log('Query rule result:', ruleData);
          
          // 规则存在，使用服务端返回的rule_content初始化
          setForm({
            roleName: ruleRoleName,
            className: ruleClassName,
            ruleContent: ruleData.rule_content || ''
          });
          
          // 设置为编辑模式
          setIsEditMode(true);
          setCurrentRule({
            key: '0',
            id: 0,
            roleName: ruleRoleName,
            className: ruleClassName,
            ruleContent: ruleData.rule_content || '',
            createTime: '-',
            updateTime: '-'
          });
        } catch (error) {
          console.error('Error querying rule:', error);
          
          // 规则不存在，设置为新增模式
          setIsEditMode(false);
          setCurrentRule(null);
          setForm({
            roleName: ruleRoleName,
            className: ruleClassName,
            ruleContent: `def process(String keyword, String rawMessage) {
               // Write your rule logic here
               // Process keywords and raw message
            
               // Return processing result
              def result = keyword;
              return result
          }`
          });
        } finally {
          // 设置测试数据
          setTestKeywords(ruleKeywords);
          setTestTrace(ruleRawMessage);
          
          // 打开Modal
          setIsModalVisible(true);
          
          // 清除localStorage中的数据，防止下次打开页面时自动弹出
          localStorage.removeItem('ruleKeywords');
          localStorage.removeItem('ruleRoleName');
          localStorage.removeItem('ruleClassName');
          localStorage.removeItem('ruleRawMessage');
        }
      };
      
      queryRule();
    }

  }, []);

  return (
    <PluginPage>
      <div className={styles.container}>
        <div className={styles.header}>
          <AntButton 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddRule}
          >
            Add Grouping Script
          </AntButton>
        </div>
        
        <div className={styles.tableContainer}>
          <Table
            columns={columns}
            dataSource={data}
            rowKey="key"
            pagination={{ pageSize: 10 }}
            loading={loading}
            bordered
          />
        </div>

        <Modal
          title={isEditMode ? "Edit Keywords Script" : "Add Keywords Script"}
          open={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          confirmLoading={loading}
          okText="Save"
          width={800}
        >
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Role Name:</label>
            <Select
              style={{ width: '100%' }}
              value={form.roleName}
              onChange={(value) => handleInputChange('roleName', value)}
              placeholder="Please select role name"
              disabled={isEditMode}
              options={roleOptions}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Class Name:</label>
            <Input
              value={form.className}
              onChange={(e) => handleInputChange('className', e.target.value)}
              placeholder="Please enter class name"
              disabled={isEditMode}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Groovy Script:</label>
            <div 
            style={{ 
                border: `1px solid ${validationStatus ? (validationStatus === 'success' ? '#52c41a' : '#ff4d4f') : '#d9d9d9'}`,
                borderRadius: '2px',
                position: 'relative'
            }}
            >
            <SyntaxHighlighter
                language="groovy"
                style={tomorrow}
                customStyle={{
                margin: 0,
                padding: '4px 11px',
                minHeight: '150px',
                maxHeight: '300px',
                fontSize: '14px',
                lineHeight: '1.5',
                fontFamily: 'monospace',
                backgroundColor: 'transparent'
                }}
                codeTagProps={{
                style: {
                    fontFamily: 'inherit'
                }
                }}
            >
                {form.ruleContent || ''}
            </SyntaxHighlighter>
            <textarea
                value={form.ruleContent}
                onChange={(e) => handleRuleContentChange(e.target.value)}
                placeholder="Please enter rule content (Groovy script)"
                style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                color: 'transparent',
                background: 'transparent',
                caretColor: 'black',
                resize: 'none',
                border: 'none',
                padding: '4px 11px',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.5',
                zIndex: 1
                }}
            />
            </div>
        </div>
          
          <div style={{ marginBottom: '16px', border: '1px solid #d9d9d9', padding: '16px', borderRadius: '4px' }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Validate Rule</div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Test Keywords:</label>
              <Input.TextArea
                value={testKeywords}
                onChange={handleTestKeywordsChange}
                placeholder="Please enter test keywords"
                rows={2}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Test Trace:</label>
              <Input.TextArea
                value={testTrace}
                onChange={handleTestTraceChange}
                placeholder="Please enter test trace"
                rows={4}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <AntButton 
                type="primary" 
                onClick={validateRule}
                loading={validating}
              >
                Validate
              </AntButton>
              
              {validationResult && (
                <div 
                  style={{ 
                    marginLeft: '16px', 
                    padding: '8px', 
                    backgroundColor: validationStatus === 'success' ? '#f6ffed' : '#fff2f0',
                    border: `1px solid ${validationStatus === 'success' ? '#b7eb8f' : '#ffccc7'}`,
                    borderRadius: '4px',
                    flex: 1
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {validationStatus === 'success' ? 'Validation Successful' : 'Validation Failed'}
                  </div>
                  <div style={{ wordBreak: 'break-word' }}>{validationResult}</div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </PluginPage>
  );
}

export default RulesConfiguration;

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    padding: ${theme.spacing(2)};
  `,
  header: css`
    margin-bottom: ${theme.spacing(2)};
    display: flex;
    justify-content: flex-start;
  `,
  tableContainer: css`
    background-color: ${theme.colors.background.primary};
    border-radius: ${theme.shape.borderRadius()};
    box-shadow: ${theme.shadows.z1};
  `,
});