// netlify/functions/cercaVoliAmadeus.js
const fetch = require('node-fetch');

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;
const AMADEUS_BASE_URL = "https://test.api.amadeus.com"; // URL base di test

// Funzione per ottenere/gestire il token di accesso OAuth
// Per semplicità, questa versione richiede un nuovo token ad ogni chiamata.
// In produzione, dovresti memorizzare il token e riutilizzarlo finché non scade.
async function getAmadeusAccessToken() {
    if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
        console.error("ERRORE FUNZIONE: AMADEUS_API_KEY o AMADEUS_API_SECRET non definite nelle variabili d'ambiente.");
        throw new Error("Configurazione API Key/Secret mancante lato server.");
    }

    const tokenUrl = `${AMADEUS_BASE_URL}/v1/security/oauth2/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', AMADEUS_API_KEY);
    params.append('client_secret', AMADEUS_API_SECRET);

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("ERRORE FUNZIONE: Errore ottenimento token Amadeus:", data);
            throw new Error(`Errore Amadeus Auth (${response.status}): ${data.error_description || data.error || 'Errore sconosciuto'}`);
        }
        console.log("INFO FUNZIONE: Access token Amadeus ottenuto con successo.");
        return data.access_token;
    } catch (error) {
        console.error("ERRORE FUNZIONE: Eccezione durante ottenimento token Amadeus:", error);
        throw error; // Rilancia l'errore per essere gestito dal chiamante
    }
}

exports.handler = async function(event, context) {
    const { origin, departureDate, duration, maxPrice } = event.queryStringParameters;

    if (!origin || !departureDate || !duration || !maxPrice) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Parametri mancanti: origin, departureDate, duration, maxPrice sono richiesti." })
        };
    }

    try {
        const accessToken = await getAmadeusAccessToken();

        const inspirationUrl = new URL(`${AMADEUS_BASE_URL}/v1/shopping/flight-destinations`);
        inspirationUrl.searchParams.append('origin', origin);
        inspirationUrl.searchParams.append('departureDate', departureDate);
        inspirationUrl.searchParams.append('duration', duration); // Es. P3D per 3 giorni (Venerdì, Sabato, Domenica)
        //inspirationUrl.searchParams.append('maxPrice', maxPrice);
        inspirationUrl.searchParams.append('viewBy', 'DESTINATION'); // Organizza per destinazione

        console.log(`INFO FUNZIONE: Chiamata a Amadeus Flight Inspiration: ${inspirationUrl.href.replace(accessToken, "TOKEN_OSCURATO")}`);

        const apiResponse = await fetch(inspirationUrl.href, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const responseData = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error(`ERRORE FUNZIONE: Errore da Amadeus Flight Inspiration (${apiResponse.status}):`, responseData);
            // Amadeus spesso mette gli errori in un array 'errors'
            const errorDetail = responseData.errors && responseData.errors[0] ? 
                               (responseData.errors[0].detail || responseData.errors[0].title) : 
                               'Errore API sconosciuto';
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({ error: `Errore API Amadeus: ${errorDetail}`, amadeus_response_error: responseData })
            };
        }
        
        console.log(`INFO FUNZIONE: Risposta valida da Amadeus Flight Inspiration per ${origin} in data ${departureDate}.`);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Successo", amadeus_response: responseData })
        };

    } catch (error) {
        console.error("ERRORE FUNZIONE - Eccezione imprevista:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Errore interno della funzione: ${error.message || error.toString()}` })
        };
    }
};
