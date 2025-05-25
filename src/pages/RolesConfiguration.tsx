import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, Button } from '@grafana/ui';
import { PluginPage } from '@grafana/runtime';
import { getHttpRequest, postHttpRequest } from '../utils/api';
import { Table, Space, Button as AntButton, Modal, Input, Popconfirm, message } from 'antd';
import { DeleteOutlined, PlusOutlined} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useNavigate } from 'react-router-dom';

interface RoleItem {
  key: string;
  id: number;
  roleName: string;
  addTime: string;
}

function RolesConfiguration() {
  const styles = useStyles2(getStyles);
  const [data, setData] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState<string>('');
  const navigate = useNavigate();

  // Define table columns
  const columns: TableColumnsType<RoleItem> = [
    {
      title: 'No.',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Role Name',
      dataIndex: 'roleName',
      key: 'roleName',
    },
    {
      title: 'Create Time',
      dataIndex: 'addTime',
      key: 'addTime',
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <AntButton 
          type="text" 
          danger 
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record)}
        >
          delete
        </AntButton>
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

  // Get role data
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const requestBody = {
        command: 'get_roles',
        group: "default"
      };
      
      const response = await getHttpRequest(requestBody, "/api/v1/management/fetch_roles");
      console.log('Retrieved role data:', response);
      
      // Convert data format
      const formattedData = Array.isArray(response) ? response.sort((a, b) => {
        const timeA = a.create_time ? new Date(a.create_time).getTime() : 0;
        const timeB = b.create_time ? new Date(b.create_time).getTime() : 0;
        
        return timeA - timeB;
      }).map((role, index) => ({
        key: index.toString(),
        id: index + 1,
        roleName: role.role_name || role,
        addTime: formatDateTime(role.create_time) || '-',
      })) : [];
      
      setData(formattedData);
    } catch (error) {
      console.error('Error getting role data:', error);
      message.error('Failed to get role data');
    } finally {
      setLoading(false);
    }
  };

  // Add new role
  const handleAddRole = () => {
    setIsModalVisible(true);
  };

  // Confirm adding role
  const handleOk = async () => {
    if (!newRoleName.trim()) {
      message.warning('Role name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        command: 'add_role',
        role_name: newRoleName.trim(),
        group: "default"
      };
      
      await postHttpRequest(requestBody, "/api/v1/management/add_role");
      message.success('Role added successfully');
      setIsModalVisible(false);
      setNewRoleName('');
      fetchRoles(); // Reload data
    } catch (error) {
      console.error('Error adding role:', error);
      message.error('Failed to add role');
    } finally {
      setLoading(false);
    }
  };

  // Cancel adding role
  const handleCancel = () => {
    setIsModalVisible(false);
    setNewRoleName('');
  };

  // Delete role
  const handleDelete = async (record: RoleItem) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Are you sure you want to delete role "${record.roleName}"?`,
      onOk: async () => {
        setLoading(true);
        try {
          const requestBody = {
            command: 'delete_role',
            role_name: record.roleName,
            group: "default"
          };
          
          await getHttpRequest(requestBody, "/api/v1/management/delete_role");
          message.success('Role deleted successfully');
          fetchRoles(); // Reload data
        } catch (error) {
          console.error('Error deleting role:', error);
          message.error('Failed to delete role');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Initialize data loading
  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <PluginPage>
      <div className={styles.container}>
        <div className={styles.header}>
          <AntButton type="primary" onClick={handleAddRole} icon={<PlusOutlined />} >
            Add Role
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
          title="Add Role"
          open={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          confirmLoading={loading}
        >
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Role Name:</label>
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Please enter role name"
            />
          </div>
        </Modal>
      </div>
    </PluginPage>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    padding: ${theme.spacing(2)};
  `,
  header: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${theme.spacing(3)};
  `,
  tableContainer: css`
    background-color: ${theme.colors.background.primary};
    border-radius: ${theme.shape.borderRadius()};
    box-shadow: ${theme.shadows.z1};
  `,
});

export default RolesConfiguration;