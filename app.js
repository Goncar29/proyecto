require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const app = express();

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
    res.send(`
        <h1>Curso Express.js</h1>
        <p>¡Bienvenido al proyecto con Express.js!</p>
        <p>Este es un ejemplo básico de una aplicación Express.js.</p>
        <p>Escuchando el ${PORT}</p>
        `);
});

app.get('/user/:id', (req, res) => {
    const userId = req.params.id;
    res.send(`User ID: ${userId}`);
})

app.get('/search', (req, res) => {
    const terms = req.query.termino || 'No especificado';
    const category = req.query.category || 'Todas';

    res.send(`
        <h2>Resultados de la búsqueda</h2>
        <p>Término de búsqueda: ${terms}</p>
        <p>Categoría: ${category}</p>
        `);
});

app.post('/form', (req, res) => {
    const name = req.body.nombre || 'Anonimo';
    const email = req.body.email || 'No especificado';

    res.json({
        message: `Formulario recibido`,
        data: {
            name,
            email
        }
    });
});

app.post('/api/data', (req, res) => {
    const data = req.body;

    if (!data || Object.keys(data).lenght === 0) {
        return res.status(400).json({
            error: `No se recibieron datos`
        });
    }

    res.status(201).json({
        message: `Datos recibidos correctamente`,
        data: data
    });
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});