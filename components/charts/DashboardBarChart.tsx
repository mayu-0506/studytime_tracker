"use client"

import { useMemo } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js"
import { Bar } from "react-chartjs-2"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

// Chart.jsの登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface DashboardBarChartProps {
  data: Array<{ date: string; total_min: number }>
  title: string
  dateFormat?: string
  color?: string
}

export default function DashboardBarChart({ 
  data, 
  title, 
  dateFormat = 'MM/dd',
  color = 'rgba(59, 130, 246, 0.8)'
}: DashboardBarChartProps) {
  // 最大時間をチェックして単位を決定
  const maxMinutes = useMemo(() => {
    return Math.max(...data.map(item => item.total_min), 0)
  }, [data])
  
  const useMinutes = maxMinutes < 60 // 1時間未満の場合は分単位で表示

  const chartData = useMemo(() => {
    const labels = data.map(item => 
      format(new Date(item.date), dateFormat, { locale: ja })
    )
    
    const values = data.map(item => useMinutes ? item.total_min : item.total_min / 60)
    
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: color,
          borderColor: color.replace('0.8', '1'),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    }
  }, [data, dateFormat, color, useMinutes])

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 14,
          weight: 'bold',
        },
        color: '#1f2937', // gray-800
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y
            return useMinutes 
              ? `学習時間: ${Math.round(value)}分`
              : `学習時間: ${value.toFixed(1)}時間`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => useMinutes ? `${value}m` : `${value}h`,
          color: '#6b7280',
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
      },
      x: {
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-sm">データがありません</p>
      </div>
    )
  }

  return (
    <div className="h-48">
      <Bar data={chartData} options={options} />
    </div>
  )
}