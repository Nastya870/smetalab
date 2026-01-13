// ==============================|| DASHBOARD - TOTAL ORDER YEAR CHART ||============================== //

const chartData = {
  type: 'line',
  height: 90,
  options: {
    chart: {
      sparkline: {
        enabled: true
      }
    },
    dataLabels: {
      enabled: false
    },
    colors: ['#fff'],
    fill: {
      type: 'solid',
      opacity: 1
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    yaxis: {
      min: 0,
      max: 10,
      labels: {
        show: false
      }
    },
    tooltip: {
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: (seriesName) => 'Общие заказы'
        }
      },
      marker: {
        show: false
      }
    }
  },
  series: [
    {
      name: 'series1',
      data: [3, 4, 1, 5, 4, 6, 4, 6, 2, 3, 5, 1] // 12 месяцев, макс 10
    }
  ]
};

export default chartData;
