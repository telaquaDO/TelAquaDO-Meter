/**
 * Hostinger Web App entry file (Express).
 * Works for both:
 * - new Web Apps: node server.js + process.env.PORT
 * - older Passenger: module.exports = app
 */
const path = require('path');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const root = __dirname;

app.disable('x-powered-by');
app.use(express.static(root, { extensions: ['html'] }));

app.use((_req, res) => {
  res.status(404).sendFile(path.join(root, 'index.html'));
});

module.exports = app;

app.listen(port, () => {
    console.log(`Tel-Aqua site listening on ${port}`);
});
