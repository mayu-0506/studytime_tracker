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
import { StudySummaryData, StudyGrain } from "@/actions/study-stats"

// Chart.jsの登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface StudyHistoryChartProps {
  data: StudySummaryData[]
  grain: StudyGrain
}

export default function StudyHistoryChart({ data, grain }: StudyHistoryChartProps) {
  // 最大時間をチェックして単位を決定
  const maxMinutes = useMemo(() => {
    return Math.max(...data.map(item => item.total_min), 0)
  }, [data])
  
  const useMinutes = maxMinutes < 60 // 1時間未満の場合は分単位で表示

  const chartData = useMemo(() => {
    // 日付フォーマットを粒度に応じて変更
    const dateFormat = grain === 'day' ? 'MM/dd' : grain === 'week' ? 'MM/dd' : 'yyyy/MM'
    
    const labels = data.map(item => 
      format(new Date(item.bucket_start), dateFormat, { locale: ja })
    )
    
    const values = data.map(item => useMinutes ? item.total_min : item.total_min / 60)
    
    return {
      labels,
      datasets: [
        {
          label: useMinutes ? '学習時間（分）' : '学習時間（時間）',
          data: values,
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    }
  }, [data, grain, useMinutes])

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: grain === 'day' ? '日別学習時間' : grain === 'week' ? '週別学習時間' : '月別学習時間',
        font: {
          size: 16,
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
        title: {
          display: true,
          text: '時間',
          color: '#6b7280', // gray-500
        },
        ticks: {
          callback: (value) => useMinutes ? `${value}m` : `${value}h`,
          color: '#6b7280',
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
      },
      x: {
        ticks: {
          color: '#6b7280',
        },
        grid: {
          display: false,
        },
      },
    },
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">学習記録がありません</p>
      </div>
    )
  }

  return (
    <div className="h-64 md:h-80">
      <Bar data={chartData} options={options} />
    </div>
  )
}