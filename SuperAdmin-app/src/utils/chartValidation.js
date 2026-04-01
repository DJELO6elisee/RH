/**
 * Utility functions for validating Chart.js data structures
 */

/**
 * Validates if chart data has the correct structure for Chart.js
 * @param {Object} data - Chart data object
 * @returns {boolean} - True if data is valid
 */
export const isValidChartData = (data) => {
    if (!data || typeof data !== 'object') {
        return false;
    }

    // Check if datasets exists and is an array
    if (!Array.isArray(data.datasets) || data.datasets.length === 0) {
        return false;
    }

    // Check each dataset
    for (const dataset of data.datasets) {
        if (!dataset || typeof dataset !== 'object') {
            return false;
        }

        // Check if data property exists and is an array
        if (!Array.isArray(dataset.data)) {
            return false;
        }
    }

    return true;
};

/**
 * Creates a safe chart data object with default values
 * @param {Object} data - Chart data object
 * @returns {Object} - Safe chart data object
 */
export const createSafeChartData = (data) => {
    if (isValidChartData(data)) {
        return data;
    }

    // Return default safe data structure
    return {
        labels: ['No Data'],
        datasets: [{
            label: 'No Data',
            data: [0],
            backgroundColor: '#6c757d',
            borderColor: '#6c757d',
        }],
    };
};
