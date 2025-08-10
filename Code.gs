/**
 * ******************************************************************
 * AI EDUCATIONAL ASSISTANT - GOOGLE APPS SCRIPT BACKEND (REFACTORED)
 * ******************************************************************
 *
 * This script manages prompts and handles feedback/signup submissions
 * for the AI Educational Assistant Suite.
 * Prompts are now stored in separate .html files for maintainability.
 *
 * Created by: Derrick Musamali (musadrk2@gmail.com)
 * Refactored by: Gemini
 *
 * ******************************************************************
 */

// --- CONFIGURATION ---
const YOUR_EMAIL_ADDRESS = "musadrk2@gmail.com";

/**
 * This object maps the "Assistant Name" from the frontend to the
 * corresponding filename in your Apps Script project.
 *
 * TO ADD A NEW ASSISTANT:
 * 1. Create a new .html file (e.g., "My-New-Assistant.html").
 * 2. Paste the prompt content into that file.
 * 3. Add a new entry to this object below.
 * The key is the name that will appear in the dropdown menu.
 * The value is the name of the .html file (without the .html extension).
 */
const ASSISTANT_FILES = {
    "Item Writer": "item-writer",
    "Scheme of Work (with Biblical values)": "sow-bv",
    //"Scheme of Work(NCDC)" : "sow-no-bv",
    // "Lesson Notes Generator": "lesson-notes", // Example of another assistant
    // "Lesson Plans (NCDC)": "lesson-plans-no-bv" // Example
    // "Lesson Plans (with Biblical Integration)": "lesson-plans-bv",
    //"UCE Project Assistant" : "uce-project-assistant",
};


/**
 * Main entry point for GET requests from the web app.
 * This function routes requests based on the 'action' parameter.
 * @param {Object} e The event parameter from the GET request.
 * @returns {ContentService.TextOutput} A JSON response.
 */
function doGet(e) {
    try {
        const action = e.parameter.action;
        let output;

        if (action === 'getAssistants') {
            // Action to get the list of all available assistant names.
            // This now just sends the keys from our ASSISTANT_FILES object.
            output = ContentService.createTextOutput(JSON.stringify({
                success: true,
                assistants: Object.keys(ASSISTANT_FILES)
            }));

        } else if (action === 'getPrompt' && e.parameter.assistant) {
            // Action to get the specific prompt content for a given assistant.
            const assistantName = e.parameter.assistant;
            const fileName = ASSISTANT_FILES[assistantName];

            if (fileName) {
                try {
                    // Read the content directly from the corresponding HTML file.
                    const promptContent = HtmlService.createHtmlOutputFromFile(fileName).getContent();
                    
                    // Check if the file was empty or couldn't be read properly.
                    if (!promptContent || promptContent.trim() === '') {
                       throw new Error(`Prompt file '${fileName}.html' is empty.`);
                    }

                    output = ContentService.createTextOutput(JSON.stringify({
                        success: true,
                        assistant: assistantName,
                        prompt: promptContent
                    }));

                } catch (err) {
                    // This catch handles cases where the file exists in the list but not in the project.
                    console.error(`Error reading file for assistant '${assistantName}': ${err.message}`);
                    output = ContentService.createTextOutput(JSON.stringify({
                        success: false,
                        error: `Could not load prompt for '${assistantName}'. Check server logs.`
                    }));
                }
            } else {
                // Handle case where the requested assistant name doesn't exist in our list.
                output = ContentService.createTextOutput(JSON.stringify({
                    success: false,
                    error: `Assistant '${assistantName}' not found.`
                }));
            }
        } else {
            // Handle invalid or missing actions.
            output = ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Invalid action or missing parameters.'
            }));
        }

        return output.setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        // Generic error handling for any unexpected issues.
        console.error('Error in doGet:', error);
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: 'Internal Server Error: ' + error.toString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Main entry point for POST requests from the web app.
 * This function handles data submissions, like feedback or signups.
 * (This function remains unchanged from your original)
 * @param {Object} e The event parameter from the POST request.
 * @returns {ContentService.TextOutput} A JSON response.
 */
function doPost(e) {
    try {
        const body = JSON.parse(e.postData.contents);
        const action = body.action;

        if (action === 'submitFeedback') {
            const { rating, feedbackText, assistantName, email } = body;

            if (rating && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
                throw new Error("Invalid rating provided.");
            }

            const subject = email ?
                `New Signup & Feedback: ${rating ? `${rating} ★` : 'Email Only'}` :
                `New Feedback: ${rating} ★`;

            let emailBody = `<p>You've received a new submission from your AI Educational Assistant!</p><hr>`;

            if (rating) {
                emailBody += `
                <p><strong>Assistant Used:</strong> ${assistantName || 'N/A'}</p>
                <p><strong>Rating:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</p>
                <p><strong>Feedback:</strong></p>
                <pre style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word;">${feedbackText || 'No detailed feedback provided.'}</pre>
                <hr>`;
            }

            if (email) {
                emailBody += `
                <p><strong>🎉 New Email Signup!</strong></p>
                <p>A user has signed up for future updates.</p>
                <p><strong>Email:</strong> ${email}</p>`;
            }

            MailApp.sendEmail({
                to: YOUR_EMAIL_ADDRESS,
                subject: subject,
                htmlBody: emailBody,
                name: "AI Assistant Bot"
            });

            return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Submission successful." }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid POST action." }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        console.error('Error in doPost:', error);
        return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Internal Server Error: ' + error.toString()
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
