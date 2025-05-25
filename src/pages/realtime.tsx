import React, { useEffect, useState, useRef } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { PluginPage } from '@grafana/runtime';
import { getHttpRequest, fetchRoleNames, convertRoleNames } from '../utils/api';
import { Table, Space, Switch } from 'antd';
import type { TableColumnsType, TimeRangePickerProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';
import { DatePicker, Button } from 'antd';
const { RangePicker } = DatePicker;
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

interface ErrorData {
  timestamp: string;
  count: number;
  isNewException: string;
}

interface RoleData {
  [roleName: string]: ErrorData[];
}

function RealTimePage() {
    const styles = useStyles2(getStyles);
    const [data, setData] = useState<RoleData>({});
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [selectedTimestamp, setSelectedTimestamp] = useState<string>('');
    const [detailData, setDetailData] = useState<any[]>([]);
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
    const [roleNames, setRoleNames] = useState<string[]>([]);
    const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const fetchRoles = async () => {
    try {
      const names = await fetchRoleNames();
      setRoleNames(names);
    } catch (error) {
      console.error('Error fetching role names:', error);
    } 
  };

  const rangePresets: TimeRangePickerProps['presets'] = [
    { label: 'Last 20 minutes', value: [dayjs().subtract(20, 'minute'), dayjs()] },
    { label: 'Last 30 minutes', value: [dayjs().subtract(30, 'minute'), dayjs()] },
    { label: 'Last 40 minutes', value: [dayjs().subtract(40, 'minute'), dayjs()] },
  ];

  const handleApply = async () => {
    setAutoRefresh(false);
    if (range[0] && range[1]) {
      const requestBody = {
        group: "default",
        from: range[0].format('YYYY-MM-DD HH:mm'),
        to: range[1].format('YYYY-MM-DD HH:mm'),
        type: "minute"
      };
      const data = await getHttpRequest(requestBody, "/role_count_list");
      const rolesNames = convertRoleNames(data.role_names);
      setRoleNames(rolesNames);
      setData(data.table_data);
    }
  };

  // 获取数据
  const fetchData = async () => {
    try {
      const fromTime = dayjs().subtract(30, 'minute').format('YYYY-MM-DD HH:mm');
      const toTime = dayjs().format('YYYY-MM-DD HH:mm');
      const requestBody = {
        group: "default",
        from: fromTime, //yyyy-MM-dd HH:mm
        to: toTime,
        type: "minute"
      };

      const data = await getHttpRequest(requestBody, "/role_count_list");
      const rolesNames = convertRoleNames(data.role_names);
      setRoleNames(rolesNames);
      setData(data.table_data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // 获取详细数据
  const fetchDetailData = async (role: string, timestamp: string) => {
    try {
      setExpandedRowKeys([]);

      const requestBody = {
        role_name: role,
        specfic_date: timestamp,
        type: "minute",
        group: "default"
      };

      const data = await getHttpRequest(requestBody, "/getSpecficData");

      setDetailData(data);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching detail data:', error);
    }
  };

  // 处理单元格点击
  const handleCellClick = (role: string, timestamp: string) => {
    setSelectedRole(role);
    setSelectedTimestamp(timestamp);
    fetchDetailData(role, timestamp);
  };

  useEffect(() => {
    // 清除之前的定时器
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // 如果启用了自动刷新，则设置定时器
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchData();
      }, 30000); // 30秒
    }

    // 组件卸载时清除定时器
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh]);

  // 初始化
  useEffect(() => {
    // 获取Roles参数
    //fetchRoles();
    // 获取数据
    fetchData();
  }, []);

  // 渲染主表格
  const renderMainTable = () => {
    if (roleNames.length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          border: '1px solid #f0f0f0', 
          borderRadius: '4px',
          margin: '20px 0'
        }}>
          <p>Please go to the Roles Setting page to add roles to monitor</p>
          <Button 
            onClick={() => navigate(prefixRoute(ROUTES.RolesConfiguration))}
            type="primary"
          >
            Go to Roles Setting
          </Button>
        </div>
      );
    }

    // 获取所有日期
    const dates: string[] = [];
    if (Object.keys(data).length > 0) {
      const firstRole = Object.keys(data)[0];
      data[firstRole]?.forEach(item => {
        if (!dates.includes(item.timestamp)) {
          dates.push(item.timestamp);
        }
      });
    }

    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Services Name</th>
              {dates.map((date, index) => { 
                const dateObj = new Date(date); 
                const formattedDate = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`; 
                // 每5列显示一次时间戳
                return <th key={index}>{index % 5 === 0 ? formattedDate : ''}</th>; 
                })}
            </tr>
          </thead>
          <tbody>
            {roleNames.map(roleName => (
              <tr key={roleName}>
                <td className={styles.roleName}>
                    {roleName}
                </td>
                {dates.map((date, index) => {
                  const errorData = data[roleName]?.find(item => item.timestamp === date);
                  if (!errorData) {
                    return <td key={index}>-</td>;
                  }
                  
                  const isNewException = errorData.isNewException === 'true';
                  const isHighCount = errorData.count > 1000;
                  
                  return (
                    <td 
                      key={index}
                      className={`${isNewException ? styles.newException : styles.normalCell} ${isHighCount ? styles.highCount : ''} ${roleName === selectedRole && date === selectedTimestamp ? styles.selectedCell : ''}`}
                      onClick={() => handleCellClick(roleName, date)}
                    >
                      {errorData.count}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDetailTable = () => {
    if (!showDetails || detailData.length === 0) {
      return null;
    }
  
    // 定义表格列
    const columns: TableColumnsType<any> = [
      {
        title: 'Quantity',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 180,
        render: (text, record) => {
          const isNew = record.newException === 'true';
          return (
            <div style={{ 
              backgroundColor: isNew ? '#F097A8' : 'transparent', 
              color: isNew ? 'white' : 'inherit',
              padding: '4px 8px'
            }}>
              {text}
            </div>
          );
        },
      },
      {
        title: 'Message',
        dataIndex: 'message',
        key: 'message',
        render: (text, record) => {
          const isNew = record.newException === 'true';
          return (
            <div style={{ 
              backgroundColor: isNew ? '#F097A8' : 'transparent', 
              color: isNew ? 'white' : 'inherit',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              padding: '4px 8px'
            }}>
              {text}
            </div>
          );
        },
      },
    ];
  
    // 处理数据，确保每条记录有唯一的 key
    const processedData = detailData.map((item, index) => ({
      ...item,
      key: index.toString(),
      children: item.children ? item.children.map((child, childIndex) => ({
        ...child,
        key: `${index}-${childIndex}`,
      })) : undefined
    }));
  
    return (
      <div className={styles.detailContainer}>
        <div className="page-wrapper" style={{ minHeight: '300px', width: '100%' }}>
          <Table
            columns={columns}
            dataSource={processedData}
            rowKey="key"
            pagination={false}
            expandable={{
              defaultExpandAllRows: false,
              expandedRowKeys: expandedRowKeys,
              onExpandedRowsChange: (expandedRows) => {
                setExpandedRowKeys(expandedRows as string[]);
              },
            }}
            size="middle"
            bordered
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  };

  return (
    <PluginPage>
        <div className={styles.container}>
          <div className={styles.controls}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Switch 
                  checked={autoRefresh} 
                  onChange={(checked) => {
                    setAutoRefresh(checked);
                    if (checked) {
                      setShowDetails(false);
                    }
                  }} 
                />
                <span style={{ marginLeft: 8 }}>Auto Refresh</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  value={range}
                  onChange={(val) => setRange(val)}
                  style={{ marginRight: 8 }}
                  presets={rangePresets}
                />
                <Button type="primary" disabled={!range[0] || !range[1]} onClick={handleApply}>Apply</Button>
              </div>
            </div>
          </div>
          {renderMainTable()}
          {renderDetailTable()}
        </div>
      </PluginPage>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    padding: ${theme.spacing(2)};
  `,
  controls: css`
  margin-bottom: ${theme.spacing(2)};
  display: flex;
  justify-content: space-between;
  align-items: center;
  `,
  tableContainer: css`
    overflow-x: auto;
  `,
  table: css`
    width: 100%;
    border-collapse: collapse;
    margin: 10px auto;
  `,
  roleName: css`
    text-align: right;
    color: ${theme.colors.text.primary};
    padding: 8px;
    border: 2px solid ${theme.colors.background.primary};
  `,
  normalCell: css`
    background-color: rgba(75, 192, 192, 0.2);
    width: 100px;
    text-align: center;
    padding: 8px;
    border: 2px solid ${theme.colors.background.primary};
    cursor: pointer;
    
    &:hover {
      background-color: ${theme.colors.background.secondary};
    }
  `,
  selectedCell: css`
    outline: 3px solid ${theme.colors.primary.border};
    outline-offset: -3px;
    position: relative;
    z-index: 1;
  `,
  newException: css`
    background-color: rgba(255, 99, 132, 0.2);
    width: 100px;
    text-align: center;
    padding: 8px;
    border: 2px solid ${theme.colors.background.primary};
    cursor: pointer;
    
    &:hover {
      background-color: ${theme.colors.background.secondary};
    }
  `,
  highCount: css`
    color: ${theme.colors.error.text};
    font-weight: bold;
  `,
  detailContainer: css`
    margin-top: ${theme.spacing(2)};
    padding: ${theme.spacing(2)};
    background-color: ${theme.colors.background.secondary};
    border-radius: ${theme.shape.borderRadius()};
    
    .page-wrapper {
      margin-top: ${theme.spacing(2)};
    }
    
    #detailTreeTable {
      width: 100%;
    }
  `,
  closeButton: css`
    margin-bottom: ${theme.spacing(2)};
  `,
  messageCell: css`
    text-align: left;
    white-space: pre-wrap;
    word-break: break-word;
  `,
  newExceptionText: css`
    background-color: #F097A8;
    color: white;
    padding: 2px 4px;
    border-radius: 2px;
  `,
});

export default RealTimePage;