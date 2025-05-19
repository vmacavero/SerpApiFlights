// netlify/functions/cercaVoliSerpApi.js
const fetch = require('node-fetch'); // Richiede node-fetch, che Netlify installerà grazie a package.json

exports.handler = async function(event, context) {
    // Estrai i parametri dalla query string inviata dal frontend
    const { departure_id, outbound_date, return_date } = event.queryStringParameters;
    
    // Prendi la chiave API dalle variabili d'ambiente di Netlify (più sicuro!)
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
        engine: "Google Flights",
        hl: "it",
        gl: "it",
        currency: "EUR",
        departure_id: departure_id,
        // arrival_id è omesso per ricerca esplorativa
        outbound_date: outbound_date,
        return_date: return_date,
    });

    const serpApiUrl = `https://serpapi.com/search?${params.toString()}`;
    console.log("Chiamata a SerpApi URL:", serpApiUrl.replace(SERPAPI_API_KEY, "CHIAVE_OSCURATA")); // Non loggare la chiave reale

    try {
        const response = await fetch(serpApiUrl);
        const data = await response.json(); // Prova a parsare il JSON in ogni caso

        if (!response.ok) {
            console.error(`Errore da SerpApi (${response.status}):`, data.error || response.statusText);
            return {
                statusCode: response.status, // Usa lo status code originale di SerpApi se disponibile
                body: JSON.stringify({ 
                    error: `Errore da SerpApi: ${data.error || response.statusText}`, 
                    serpapi_response_error: data // Includi l'intero errore di SerpApi per debug
                })
            };
        }
        
        // Inoltra la risposta di successo da SerpApi al frontend
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
