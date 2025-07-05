const express = require('express');
const app = express();

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
    res.send(`
        <h1>Curso Express.js</h1>
        <p>¡Bienvenido al proyecto con Express.js!</p>
        <p>Este es un ejemplo básico de una aplicación Express.js.</p>
        `);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});