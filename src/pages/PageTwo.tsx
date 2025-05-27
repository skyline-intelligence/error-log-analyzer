import React, { useEffect, useState, useRef } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { PluginPage } from '@grafana/runtime';
import { getHttpRequest, fetchLicenseData, convertRoleNames } from '../utils/api';
import { Table, Space, Alert, DatePicker, Button } from 'antd';
import type { TableColumnsType, TimeRangePickerProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';
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

function PageTwo() {
  const styles = useStyles2(getStyles);
  const [data, setData] = useState<RoleData>({});
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>('');
  const [detailData, setDetailData] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [licenseData, setLicenseData] = useState<{license_type: string; expired_date: number} | null>(null);
  const navigate = useNavigate();
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const rangePresets: TimeRangePickerProps['presets'] = [
    { label: 'Last 20 days', value: [dayjs().subtract(20, 'day'), dayjs()] },
    { label: 'Last 30 days', value: [dayjs().subtract(30, 'day'), dayjs()] },
    { label: 'Last 40 days', value: [dayjs().subtract(40, 'day'), dayjs()] },
  ];

  // Get data
  const fetchData = async () => {
    try {
      const requestBody = {
        group: "default",
        from: range[0].format('YYYY-MM-DD'),
        to: range[1].format('YYYY-MM-DD'),
        type: "date"
      };

      const data = await getHttpRequest(requestBody, "/role_count_list");
      const rolesNames = convertRoleNames(data.role_names);
      setRoleNames(rolesNames);
      setData(data.table_data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

    // Handle refresh button click
    const handleFlush = () => {
      setLoading(true);
      fetchData();
      setLoading(false);
    };

  // Get detailed data
  const fetchDetailData = async (role: string, timestamp: string) => {
    try {
      // Reset expanded rows
      setExpandedRowKeys([]);

      const requestBody = {
        role_name: role,
        specfic_date: timestamp,
        group: "default",
        type: "date"
      };

      const data = await getHttpRequest(requestBody, "/getSpecficData");
      console.error('Data received:', data);

      // Set new data and show details table
      setDetailData(data);
      
      // Use setTimeout to ensure DOM is fully updated before showing the table
      // This can avoid retaining previous expansion state
      setTimeout(() => {
        setShowDetails(true);
      }, 0);
    } catch (error) {
      console.error('Error fetching detailed data:', error);
    }
  };

  // Handle cell click
  const handleCellClick = (role: string, timestamp: string) => {
    setSelectedRole(role);
    setSelectedTimestamp(timestamp);
    fetchDetailData(role, timestamp);
  };

  const handleRuleTagClick = (record) => {
    // Store keyword information in localStorage for use in RulesConfiguration page
    localStorage.setItem('ruleClassName', record.message);
    localStorage.setItem('ruleRoleName', selectedRole);
    
    localStorage.setItem('ruleKeywords', record.children[0].message);
    localStorage.setItem('ruleRawMessage', record.children[0].children[0].message);
    
    // Navigate to RulesConfiguration page
    navigate(prefixRoute(ROUTES.RulesConfiguration));
  };

  // Initialize
  useEffect(() => {
    setLoading(true);

    fetchLicenseData().then(license => {
      setLicenseData(license);
    })
    .catch(error => {
      console.error('Loading grafana config failed :', error);
    });

    const fromTime = dayjs().subtract(18, 'day').format('YYYY-MM-DD');
    const toTime = dayjs().format('YYYY-MM-DD');
    // Use local variables directly
    const requestBody = {
      group: "default",
      from: fromTime,
      to: toTime,
      type: "date"
    };
    
    getHttpRequest(requestBody, "/role_count_list")
      .then(data => {
        const rolesNames = convertRoleNames(data.role_names);
        setRoleNames(rolesNames);
        setData(data.table_data);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });

    setLoading(false);
  }, []);

  // Render main table
  const renderMainTable = () => {
    if (loading) {
      return <div>Loading...</div>;
    }

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

    // Get all dates
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
      <div>
        <div className={styles.controls}>
          <div className={styles.legendContainer}>
            <span className={styles.legendItem}>
              <span className={styles.legendColor} style={{ backgroundColor: 'rgba(75, 192, 192, 0.2)' }}></span>
              <span>Known Error</span>
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendColor} style={{ backgroundColor: 'rgba(255, 99, 132, 0.2)' }}></span>
              <span>New Error</span>
            </span>
          </div>
          <Space>
            <RangePicker
                  value={range}
                  onChange={(val) => setRange(val)}
                  style={{ marginRight: 8 }}
                  presets={rangePresets}
                />
            <Button 
              type="primary" 
              onClick={handleFlush}
              loading={loading}
              disabled={!range[0] || !range[1]}
            >
              Apply
            </Button>
          </Space>
        </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Services Name</th>
              {dates.map((date, index) => {
                const dateObj = new Date(date);
                const formattedDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
                return <th key={index}>{formattedDate}</th>;
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
                      onContextMenu={(e) => {
                        e.preventDefault();
                        navigate(prefixRoute(`${ROUTES.Hour}?role_name=${encodeURIComponent(roleName)}&from=${encodeURIComponent(date)}&type=hour`));
                      }}
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
      </div>
    );
  };

  const renderDetailTable = () => {
    if (!showDetails || detailData.length === 0) {
      return null;
    }
  
    // Define table columns
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
          const isKeywords = record.keywordsCount > 10;
          return (
            <div style={{ 
              backgroundColor: isNew ? '#F097A8' : 'transparent', 
              color: isNew ? 'white' : 'inherit',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              padding: '4px 8px',
              display: 'flex',      // Use flex layout
              justifyContent: 'space-between', // Distribute content
              alignItems: 'flex-start' // Top alignment
            }}>
              <div style={{ flex: 1 }}>{text}</div> {/* Text occupies remaining space */}
              {isKeywords && (
                <span 
                  style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    backgroundColor: '#1890ff',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap', // Prevent tag from wrapping
                    flexShrink: 0 // Prevent tag from being compressed
                  }}
                  onClick={() => handleRuleTagClick(record)}
                >
                  keywords grouping
                </span>
              )}
            </div>
          );
        },
      },
    ];
  
    // Process data, ensure each record has a unique key
    const processedData = detailData.map((item, index) => {
      const parentItem = {
        ...item,
        key: index.toString(),
      };
      
      return {
        ...parentItem,
        children: item.children ? item.children.map((child, childIndex) => ({
          ...child,
          key: `${index}-${childIndex}`,
          parent: parentItem // Add parent record reference for each child record
        })) : undefined
      };
    });
  
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
      {licenseData && licenseData.expired_date < 15 && (
        <Alert
          message="License Warning"
          description={`Your ${licenseData.license_type} license will expire in ${licenseData.expired_date} days. Please renew it in the admin configuration page to ensure uninterrupted error log analysis.`}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <div className={styles.container}>
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
    display: flex !important;
    justify-content: space-between !important;
    align-items: center;
  `,
  legendContainer: css`
    display: flex;
    gap: 16px;
  `,
  legendItem: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  legendColor: css`
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 1px solid ${theme.colors.border.medium};
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
  selectedCell: css`
    outline: 3px solid ${theme.colors.primary.border};
    outline-offset: -3px;
    position: relative;
    z-index: 1;
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

export default PageTwo;