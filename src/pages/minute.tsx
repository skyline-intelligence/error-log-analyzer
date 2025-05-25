import React, { useEffect, useState, useRef } from 'react';
import { Table, Typography, message } from 'antd';
import { Column } from '@ant-design/plots';
import type { TableColumnsType } from 'antd';
import { getHttpRequest } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

interface DataItem {
  key: string;
  quantity: number;
  message: string;
  newException: string;
  children?: DataItem[];
  haveChild?: boolean;
}

const MinutePage: React.FC = () => {
    const [labelData, setLabelData] = useState<string[]>([]);
    const [dataSet, setDataSet] = useState<number[]>([]);
    const [newException, setNewException] = useState<string[]>([]);
    const [treeData, setTreeData] = useState<DataItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
    const chartRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

  useEffect(() => {
    const queryString = window.location.search.substring(1);
    const params = parseQueryString(queryString);
    const type = 'minute';
    const from = params['from'];
    const roleName = params['role_name'];
    const timeseriesUrl = "/timeseries_bar";

    const requestBody = {
        role_name: roleName,
        from: from,
        type: type,
        to: null,
      };

    // 设置标题
    document.title = `${roleName} Error Log Analysis`;

    // 获取数据
    fetchData(requestBody, timeseriesUrl);
  }, []);

  const parseQueryString = (queryString: string) => {
    const params: Record<string, string> = {};
    const queries = queryString.split('&');
    queries.forEach(query => {
      const [key, value] = query.split('=');
      params[key] = decodeURIComponent(value);
    });
    return params;
  };

  const fetchData = async (requestBody: any, timeseriesUrl: string) => {
    try {
      setLoading(true);
      const data = await getHttpRequest(requestBody, timeseriesUrl);
      console.error('获取到的数据:', data);
      
      setLabelData(data.labels);
      setDataSet(data.dataset);
      setNewException(data.new_exception);
      setLoading(false);
    } catch (error) {
      message.error('获取数据失败！');
      setLoading(false);
    }
  };

  const generateTooltip = (params: any) => {
    return `${params.name}: ${params.value}`;
  };

  const handleBarClick = async (label: string, value: number) => {
    const queryString = window.location.search.substring(1);
    const params = parseQueryString(queryString);
    const roleName = params['role_name'];
    
    setExpandedRowKeys([]);
    try {
        const requestBody = {
            role_name: roleName,
            specfic_date: label,
            type: 'minute',
        };

        const data = await getHttpRequest(requestBody, "/getSpecficData");
        console.error('获取到的数据:', data);
        
        setTreeData(data);
    } catch (error) {
      message.error('获取详细数据失败！');
    }
  };

  // 表格列定义
  const columns: TableColumnsType<DataItem> = [
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

  // 准备图表数据
  const chartData = labelData.map((label, index) => {
    const isNew = newException[index] === 'true';
    return {
      label,
      value: dataSet[index],
      // 使用字符串类型的类别字段，而不是布尔值
      category: isNew ? 'New Error' : 'Known Error',
      isNewException: isNew
    };
  });

  const processedData = treeData.map((item, index) => ({
    ...item,
    key: index.toString(),
    children: item.children ? item.children.map((child, childIndex) => ({
      ...child,
      key: `${index}-${childIndex}`,
    })) : undefined
  }));

  return (
    <div style={{ padding: '20px' }}>
      <Title level={1} style={{ textAlign: 'center' }}>
        <a href={`/realtime.html?role_name=${encodeURIComponent(parseQueryString(window.location.search.substring(1))['role_name'])}`} target="_blank" rel="noopener noreferrer">
          {parseQueryString(window.location.search.substring(1))['role_name']} Error Log Analysis
        </a>
      </Title>
      
      <div style={{ width: '1200px', height: '300px', margin: '10px auto', border: '1px solid #ddd' }} ref={chartRef}>
      <Column
        loading={loading}
        data={chartData}
        xField="label"
        yField="value"
        yAxis={{
            type: 'log',
            minorTickLine: {
            visible: true,
            },
        }}
        tooltip={{
            formatter: (datum) => {
            return { 
                name: datum.label, 
                value: datum.value,
                // 在提示框中显示是否为新异常
                category: datum.category
            };
            },
        }}
        // 修改颜色设置方式，确保新异常显示为红色
        seriesField="category"
        // 明确定义颜色映射
        color={['#4BC0C0', '#FF6384']}
        // 移除 colorField 属性，因为我们直接使用 color 回调函数
        // colorField="isNewException"
        onReady={(plot) => {
            // 调试输出
            plot.on('plot:click', (evt) => {
            const { x, y } = evt;
            const tooltipData = plot.chart.getTooltipItems({ x, y });
            if (tooltipData.length) {
                const item = tooltipData[0];
                handleBarClick(item.data.label, item.data.value);
            }
            });
        }}
        />
      </div>
      
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
  );
};

export default MinutePage;