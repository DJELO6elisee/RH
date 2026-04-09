import { Chart } from 'chart.js';
import { getColor } from 'utils/colors';

export const getStackLineChart = ({ labels, data }) => {
    // Ensure labels and data are arrays
    const safeLabels = Array.isArray(labels) ? labels : [];
    const safeData = Array.isArray(data) ? data : [];

    return {
        labels: safeLabels,
        datasets: [{
            data: safeData,
            label: 'My First dataset',
            borderColor: getColor('primary'),
            backgroundColor: getColor('primary'),
            fill: 'origin',
            tension: 0.4,
        }],
    };
};

export const stackLineChartOptions = {
    plugins: {
        tooltip: {
            intersect: false,
        },
        legend: {
            display: false,
        },
    },
    animation: {
        duration: 0,
    },
    scales: {
        x: {
            display: false,
        },
        y: {
            display: false,
        },
    },
    // elements: {
    //   line: {
    //     tension: 0, // disables bezier curves
    //   },
    // },
};
