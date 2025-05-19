// netlify/functions/cercaVoliSerpApi.js
const fetch = require('node-fetch'); 

exports.handler = async function(event, context) {
    const { departure_id, outbound_date, return_date } = event.queryStringParameters;
    
    const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

    if (!SERPAPI_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Chiave API SerpApi non configurata come variabile d'ambiente nel backend (nome atteso: SERPAPI_API_KEY)." })
        };
    }

    if (!departure_id || !outbound_date || !return_date) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Parametri mancanti nella richiesta: departure_id, outbound_date, return_date sono richiesti." })
        };
    }

    const params = new URLSearchParams({
        api_key: SERPAPI_API_KEY,
        engine: "Google Flights",
        hl: "it",
        gl: "it",
        currency: "EUR",
        departure_id: departure_id,
        outbound_date: outbound_date,
        return_date: return_date,
    });

    const serpApiUrl = `https://serpapi.com/search?${params.toString()}`;

    try {
        const response = await fetch(serpApiUrl);
        const data = await response.json();

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Errore da SerpApi: ${data.error || response.statusText}`, serpapi_response: data })
            };
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Successo", serpapi_response: data })
        };

    } catch (error) {
        console.error("Errore nella Netlify Function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Errore interno della funzione: ${error.message}` })
        };
    }
};