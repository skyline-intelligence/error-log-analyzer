import React, { useEffect, useState, useRef } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, Button, Table } from '@grafana/ui';
import { PluginPage } from '@grafana/runtime';

interface ErrorData {
  timestamp: string;
  count: number;
  isNewException: string;
}

interface RoleData {
  [roleName: string]: ErrorData[];
}

function ErrorLogAnalysis() {
  const styles = useStyles2(getStyles);
  const [data, setData] = useState<RoleData>({});
  const [team, setTeam] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('now');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>('');
  const [detailData, setDetailData] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // 角色名称列表
  const roleNames = team === 'platform' 
    ? ["search_api", "listing_api", "materialization_api", "member_api", "auth_manager", "benefit"]
    : ["modular_home", "modular_link", "modular_search", "modular_list", "sdp_front_api", "sdp_domain", 
       "cart_api", "cart_front_api", "checkout_front_api", "order_api", "order_consumer", 
       "identity_web", "coupang_web", "coupang_cart_web"];

  // 格式化日期
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 获取数据
  const fetchData = async () => {
    try {
      // 在实际应用中，这里应该使用Grafana的数据源API
      const url = `/api/plugins/skylineintelligence-errorloganalyzer-app/resources/role_count_list?type=date&team=${encodeURIComponent(team)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      
      // 模拟数据获取
      const response = await fetch(url);
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('获取数据错误:', error);
    }
  };

  // 获取详细数据
  const fetchDetailData = async (role: string, timestamp: string) => {
    try {
      const url = `/api/plugins/skylineintelligence-errorloganalyzer-app/resources/getSpecficData?specfic_date=${encodeURIComponent(timestamp)}&role_name=${encodeURIComponent(role)}&type=date`;
      
      // 模拟数据获取
      const response = await fetch(url);
      const result = await response.json();
      setDetailData(result.data);
      setShowDetails(true);
    } catch (error) {
      console.error('获取详细数据错误:', error);
    }
  };

  // 处理单元格点击
  const handleCellClick = (role: string, timestamp: string) => {
    setSelectedRole(role);
    setSelectedTimestamp(timestamp);
    fetchDetailData(role, timestamp);
  };

  // 初始化
  useEffect(() => {
    // 获取URL参数
    const params = new URLSearchParams(window.location.search);
    const teamParam = params.get('team');
    const fromParam = params.get('from');
    const toParam = params.get('to');
    
    if (teamParam) {
      setTeam(teamParam);
    }
    
    // 设置日期范围
    if (!fromParam || !toParam) {
      const today = new Date();
      today.setDate(today.getDate() - 10);
      setFrom(formatDate(today));
    } else {
      setFrom(fromParam);
      setTo(toParam);
    }
    
    // 获取数据
    fetchData();
  }, []);

  // 渲染主表格
  const renderMainTable = () => {
    if (Object.keys(data).length === 0) {
      return <div>加载数据中...</div>;
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
              <th>角色名称</th>
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
                  <a href={`/realtime.html?role_name=${encodeURIComponent(roleName)}`} target="_blank" rel="noopener noreferrer">
                    {roleName}
                  </a>
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
                      className={`${isNewException ? styles.newException : styles.normalCell} ${isHighCount ? styles.highCount : ''}`}
                      onClick={() => handleCellClick(roleName, date)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        window.open(`/hour.html?role_name=${encodeURIComponent(roleName)}&from=${encodeURIComponent(date)}&type=hour`, '_blank');
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
    );
  };

  // 渲染详细表格
  const renderDetailTable = () => {
    if (!showDetails || detailData.length === 0) {
      return null;
    }

    return (
      <div className={styles.detailContainer}>
        <h3>{selectedRole} - {selectedTimestamp} 详细信息</h3>
        <Button onClick={() => setShowDetails(false)} className={styles.closeButton}>关闭</Button>
        <Table
          data={detailData}
          columns={[
            {
              id: 'quantity',
              header: '数量',
              cell: ({ row }) => {
                const isNew = row.original.newException === 'true';
                return (
                  <div className={isNew ? styles.newExceptionText : ''}>
                    {row.original.quantity}
                  </div>
                );
              },
            },
            {
              id: 'message',
              header: '错误信息',
              cell: ({ row }) => {
                const isNew = row.original.newException === 'true';
                return (
                  <div className={`${styles.messageCell} ${isNew ? styles.newExceptionText : ''}`}>
                    {row.original.message}
                  </div>
                );
              },
            },
          ]}
        />
      </div>
    );
  };

  return (
    <PluginPage>
      <div className={styles.container}>
        <h1>错误日志分析</h1>
        <div className={styles.controls}>
          <Button onClick={fetchData}>刷新数据</Button>
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
  detailContainer: css`
    margin-top: ${theme.spacing(3)};
    padding: ${theme.spacing(2)};
    background-color: ${theme.colors.background.secondary};
    border-radius: ${theme.shape.borderRadius()};
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

export default ErrorLogAnalysis;