const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Use body-parser to parse JSON bodies
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/generate-pdf', async (req, res) => {
    try {
        const { htmlContentBase64 } = req.body;
        if (!htmlContentBase64) {
            return res.status(400).send('Base64-encoded HTML content is required.');
        }

        // Decode the base64 string to get the HTML content
        const decodedHtmlContent = Buffer.from(htmlContentBase64, 'base64').toString('utf-8');

        // Define the complete HTML content including the received content
        const completeHtmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>PDF with Enlarged Paper Size and MathJax</title>
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
            <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
            <style>
            body {
                font-family: Arial, sans-serif;
                transform: scale(0.8); /* Scale down the content size */
                transform-origin: top left; /* Ensure scaling starts from the top-left corner */
            }
            .container {
                padding: 20px;
                margin-bottom: 20px;
            }
            .no-break {
                page-break-inside: avoid; /* Prevent breaking inside this element */
                margin-bottom: 20px;
            }
            </style>
        </head>
        <body>
            <div class="container">
                ${decodedHtmlContent}
            </div>
        </body>
        </html>
        `;

        // Launch the browser with no sandbox flags
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });

        // Create a new page
        const page = await browser.newPage();

        // Set the HTML content
        await page.setContent(completeHtmlContent, { waitUntil: 'networkidle0', timeout: 60000 });

        // Set the viewport to a specific width and height, adjusting for scaling
        await page.setViewport({ width: 1240, height: 1754 }); // A4 size in pixels at 96 DPI (approx.)

        // Wait for MathJax to finish rendering if it's included
        await page.evaluate(() => {
            if (window.MathJax) {
                return MathJax.typesetPromise();
            }
        });

        // Generate the PDF in A4 format
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                bottom: '10mm',
                left: '10mm',
                right: '10mm'
            },
            scale: 0.8
        });

        // Send the PDF as a response
        res.contentType('application/pdf');
        res.send(pdfBuffer);

        // Close the browser
        await browser.close();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
