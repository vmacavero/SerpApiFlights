// netlify/functions/cercaVoliSerpApi.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { departure_id, outbound_date, return_date } = event.queryStringParameters;
    
    const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

    if (!SERPAPI_API_KEY) {
        console.error("Errore: Chiave API SerpApi non configurata come variabile d'ambiente (SERPAPI_API_KEY).");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Configurazione backend incompleta: Chiave API mancante." })
        };
    }

    if (!departure_id || !outbound_date || !return_date) {
        console.error("Errore: Parametri mancanti:", event.queryStringParameters);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Parametri mancanti nella richiesta: departure_id, outbound_date, return_date sono richiesti." })
        };
    }

    const params = new URLSearchParams({
        api_key: SERPAPI_API_KEY,
        engine: "google_flights", // <<<--- CORREZIONE QUI!
        hl: "it",
        gl: "it",
        currency: "EUR",
        departure_id: departure_id,
        outbound_date: outbound_date,
        return_date: return_date,
    });

    const serpApiUrl = `https://serpapi.com/search?${params.toString()}`;
    // Non loggare l'intera URL con la chiave in produzione se non per debug stretto
    console.log(`Chiamata a SerpApi per engine: ${params.get('engine')}, outbound: ${params.get('outbound_date')}`);


    try {
        const response = await fetch(serpApiUrl);
        const data = await response.json(); 

        if (!response.ok) {
            console.error(`Errore da SerpApi (${response.status}):`, data.error || response.statusText);
            return {
                statusCode: response.status,
                body: JSON.stringify({ 
                    error: `Errore da SerpApi: ${data.error || response.statusText}`, 
                    serpapi_response_error: data 
                })
            };
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Successo", serpapi_response: data })
        };

    } catch (error) {
        console.error("Errore imprevisto nella Netlify Function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Errore interno della funzione: ${error.message || error.toString()}` })
        };
    }
};
