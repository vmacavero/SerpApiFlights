// netlify/functions/cercaVoliSerpApi.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Ora ci aspettiamo anche arrival_id
    const { departure_id, arrival_id, outbound_date, return_date } = event.queryStringParameters;
    
    const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

    if (!SERPAPI_API_KEY) {
        console.error("!!! ERRORE FUNZIONE: La variabile d'ambiente SERPAPI_API_KEY non è impostata o non è accessibile.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Configurazione backend critica mancante: SERPAPI_API_KEY non definita." })
        };
    }

    // arrival_id ora è obbligatorio
    if (!departure_id || !arrival_id || !outbound_date || !return_date) {
        console.error("ERRORE FUNZIONE: Parametri di query string mancanti.", event.queryStringParameters);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Parametri mancanti: departure_id, arrival_id, outbound_date, return_date sono obbligatori." })
        };
    }

    const params = new URLSearchParams({
        api_key: SERPAPI_API_KEY,
        engine: "google_flights", // Assicurati sia questo!
        hl: "it",
        gl: "it",
        currency: "EUR",
        departure_id: departure_id,
        arrival_id: arrival_id, // Aggiunto arrival_id
        outbound_date: outbound_date,
        return_date: return_date,
    });

    const serpApiUrl = `https://serpapi.com/search?${params.toString()}`;
    console.log(`INFO FUNZIONE: Chiamata API a SerpApi per engine: ${params.get('engine')}, da: ${params.get('departure_id')} a: ${params.get('arrival_id')}, data partenza: ${params.get('outbound_date')}`);

    try {
        const response = await fetch(serpApiUrl);
        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const textResponse = await response.text();
            console.warn("ERRORE FUNZIONE: Risposta da SerpApi non è JSON. Testo:", textResponse.substring(0, 500)); // Logga solo una parte
            if (!response.ok) {
                 data = { error: `SerpApi ha restituito un errore non JSON (status: ${response.status}). Risposta: ${textResponse.substring(0, 200)}...` };
            } else {
                 data = { _non_json_response_ok: true, content: textResponse };
            }
        }

        if (!response.ok) {
            const errorMessage = data.error || `Errore HTTP ${response.status} ${response.statusText}`;
            console.error(`ERRORE FUNZIONE - Errore da SerpApi (${response.status}): ${errorMessage}`, JSON.stringify(data).substring(0, 500));
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: `Errore da SerpApi: ${errorMessage}`,
                    serpapi_response_details: data
                })
            };
        }

        console.log(`INFO FUNZIONE: Risposta valida da SerpApi ricevuta per ${params.get('arrival_id')}.`);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Successo", serpapi_response: data })
        };

    } catch (error) {
        console.error("ERRORE FUNZIONE - Eccezione imprevista:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Errore interno server della funzione: ${error.message || error.toString()}` })
        };
    }
};
