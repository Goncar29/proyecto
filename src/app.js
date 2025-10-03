const express = require('express');
const routes = require('./routes');
const app = express();
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

app.use(express.json());

app.use('/api', routes);

app.get('/', (req, res) => {
    res.send('Hola, mundo!');
});

module.exports = app;