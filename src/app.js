const express = require('express');
const routes = require('./routes');
const app = express();

app.use(express.json());

app.use('/api', routes);

app.use('/', (req, res) => {
    res.send('Hola, mundo!');
});