const axios = require('axios');

exports.handler = async function (event, context) {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const gid = event.queryStringParameters.gid || '0'; // Default to first sheet if not provided

    if (!spreadsheetId) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'SPREADSHEET_ID is not defined' })
        };
    }

    // URL to fetch data from Google Sheets as CSV
    // Using export?format=csv is often easier for raw data than gviz for simple parsing, 
    // but the original code used export?format=csv so we stick to that to minimize breaking changes in parsing logic.
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    try {
        const response = await axios.get(url, { responseType: 'text' });
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Access-Control-Allow-Origin': '*' // Allow CORS
            },
            body: response.data
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch data', details: error.message })
        };
    }
};
